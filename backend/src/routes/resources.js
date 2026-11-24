const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../db');
const requireAdmin = require('../middleware/auth');
const { asyncH, toInt } = require('../util');

// Image files are stored here and served at /resources/<file_name>
const RESOURCE_DIR = process.env.RESOURCE_DIR || path.join(__dirname, '..', '..', 'resources');
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const urlOf = (fileName) => `/resources/${fileName}`;

const toDto = (r) => ({ id: r.id, url: urlOf(r.file_name), name: r.original_name, sort_order: r.sort_order });

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Save an image buffer as a new, unattached resource. */
async function saveBuffer(buf, mime, originalName) {
  if (!TYPES[mime]) throw httpError('Chỉ nhận ảnh JPG, PNG hoặc WEBP');
  if (buf.length > MAX_BYTES) throw httpError('Ảnh tối đa 8MB');
  await fs.mkdir(RESOURCE_DIR, { recursive: true });
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${TYPES[mime]}`;
  await fs.writeFile(path.join(RESOURCE_DIR, fileName), buf);
  const [r] = await pool.query('INSERT INTO resources SET ?', [
    { file_name: fileName, original_name: originalName ? String(originalName).slice(0, 255) : null, mime, size: buf.length },
  ]);
  return { id: r.insertId, url: urlOf(fileName), name: originalName || null, sort_order: 0 };
}

/** Save a data URL ("data:image/jpeg;base64,...") as a new, unattached resource. */
async function saveDataUrl(dataUrl, originalName) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!m) throw httpError('Chỉ nhận ảnh JPG, PNG hoặc WEBP');
  return saveBuffer(Buffer.from(m[2], 'base64'), m[1], originalName);
}

/** Download an image from an http(s) URL and save it as a resource. */
async function downloadImage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) throw httpError(`Không tải được ảnh (${res.status})`);
    let mime = String(res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (mime === 'image/jpg') mime = 'image/jpeg';
    if (!TYPES[mime]) throw httpError('Link không phải ảnh JPG/PNG/WEBP');
    const buf = Buffer.from(await res.arrayBuffer());
    return await saveBuffer(buf, mime, decodeURIComponent(new URL(url).pathname.split('/').pop() || 'image'));
  } finally {
    clearTimeout(timer);
  }
}

async function deleteFiles(fileNames) {
  for (const f of fileNames) {
    await fs.unlink(path.join(RESOURCE_DIR, path.basename(f))).catch(() => {});
  }
}

/** { productId: [{id, url, ...}] } for the given products (or all) */
async function imagesByProduct(productIds) {
  if (productIds && !productIds.length) return {};
  const [rows] = productIds
    ? await pool.query('SELECT * FROM resources WHERE product_id IN (?) ORDER BY sort_order, id', [productIds])
    : await pool.query('SELECT * FROM resources WHERE product_id IS NOT NULL ORDER BY sort_order, id');
  const out = {};
  for (const r of rows) (out[r.product_id] ||= []).push(toDto(r));
  return out;
}

/**
 * Make `ids` (in order) the images of product `pid`; images no longer listed are removed.
 * Keeps products.image_url = first image (or `fallbackUrl` when there is none).
 * Returns file names to delete from disk after the transaction commits.
 */
async function attachImages(conn, pid, ids, fallbackUrl = null) {
  const wanted = [...new Set((ids || []).map((x) => toInt(x, 0)).filter((x) => x > 0))];
  const [cur] = await conn.query('SELECT id, file_name FROM resources WHERE product_id = ?', [pid]);
  const removed = cur.filter((r) => !wanted.includes(r.id));
  if (removed.length) await conn.query('DELETE FROM resources WHERE id IN (?)', [removed.map((r) => r.id)]);
  for (let i = 0; i < wanted.length; i++) {
    await conn.query('UPDATE resources SET product_id = ?, sort_order = ? WHERE id = ? AND (product_id IS NULL OR product_id = ?)', [
      pid,
      i,
      wanted[i],
      pid,
    ]);
  }
  const [first] = await conn.query('SELECT file_name FROM resources WHERE product_id = ? ORDER BY sort_order, id LIMIT 1', [pid]);
  const imageUrl = first[0] ? urlOf(first[0].file_name) : fallbackUrl || null;
  await conn.query('UPDATE products SET image_url = ? WHERE id = ?', [imageUrl, pid]);
  return removed.map((r) => r.file_name);
}

/** Remove uploads that were never attached to a product or used as a collection cover (older than 1 day). */
async function cleanupOrphans() {
  const [rows] = await pool.query(`
    SELECT r.id, r.file_name FROM resources r
    WHERE r.product_id IS NULL AND r.created_at < NOW() - INTERVAL 1 DAY
      AND NOT EXISTS (SELECT 1 FROM collections c WHERE c.cover_image = CONCAT('/resources/', r.file_name))`);
  if (!rows.length) return;
  await pool.query('DELETE FROM resources WHERE id IN (?)', [rows.map((r) => r.id)]);
  await deleteFiles(rows.map((r) => r.file_name));
  console.log(`[resources] removed ${rows.length} unused file(s)`);
}

// ---- Admin API ----
const router = express.Router();
router.use(requireAdmin);

// POST /api/admin/resources  { data: "data:image/...;base64,...", name }  ->  { id, url }
router.post(
  '/',
  express.json({ limit: '12mb' }),
  asyncH(async (req, res) => {
    try {
      res.status(201).json(await saveDataUrl(req.body?.data, req.body?.name));
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      throw err;
    }
  })
);

router.delete(
  '/:id',
  asyncH(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    await pool.query('DELETE FROM resources WHERE id = ?', [req.params.id]);
    await deleteFiles([rows[0].file_name]);
    if (rows[0].product_id) {
      const conn = await pool.getConnection();
      try {
        const [left] = await conn.query('SELECT id FROM resources WHERE product_id = ? ORDER BY sort_order, id', [rows[0].product_id]);
        await attachImages(conn, rows[0].product_id, left.map((r) => r.id));
      } finally {
        conn.release();
      }
    }
    res.json({ ok: true });
  })
);

module.exports = { router, RESOURCE_DIR, urlOf, attachImages, imagesByProduct, deleteFiles, cleanupOrphans, saveBuffer, downloadImage };
