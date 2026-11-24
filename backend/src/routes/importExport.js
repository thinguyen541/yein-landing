/**
 * Excel import / export of products (admin).
 *   GET  /api/admin/import-export/export            -> .xlsx (all products)
 *   GET  /api/admin/import-export/template          -> empty .xlsx template
 *   POST /api/admin/import-export/preview  { fileName, data(base64), imageNames[] }
 *   POST /api/admin/import-export/commit   { fileName, data(base64), uploaded: { "F3714.jpg": resourceId } }
 * Images are uploaded beforehand through /api/admin/resources (one request per file, with progress).
 */
const fs = require('fs/promises');
const path = require('path');
const express = require('express');
const { pool } = require('../db');
const requireAdmin = require('../middleware/auth');
const { asyncH } = require('../util');
const { readXlsx, writeXlsx, readCsv } = require('../lib/xlsx');
const { analyzeImport } = require('../lib/productImport');
const { RESOURCE_DIR, urlOf, attachImages, deleteFiles, saveBuffer, downloadImage } = require('./resources');

const router = express.Router();
router.use(requireAdmin);
router.use(express.json({ limit: '25mb' }));

const HEADERS = ['Mã kính', 'Tên sản phẩm', 'Bộ sưu tập', 'Dòng', 'Giá', 'Giá khuyến mãi', 'Nổi bật', 'Hiển thị', 'Thứ tự', 'Mô tả', 'Ảnh', 'Giá đang bán (chỉ xem)'];
const WIDTHS = [14, 40, 18, 26, 14, 16, 9, 9, 8, 40, 60, 22];

function guideSheet(collections) {
  return {
    name: 'Hướng dẫn',
    header: false,
    widths: [26, 90],
    rows: [
      ['HƯỚNG DẪN NHẬP SẢN PHẨM', ''],
      ['', ''],
      ['Mã kính', 'Bắt buộc. Dùng để nhận biết sản phẩm: mã đã có thì cập nhật, mã mới thì thêm sản phẩm.'],
      ['Ô để trống', 'Giữ nguyên giá trị hiện tại (sản phẩm mới: dùng mặc định).'],
      ['Xoá giá trị', 'Ghi dấu "-" để xoá (ví dụ Giá = "-" thì dùng giá mặc định của bộ sưu tập).'],
      ['Bộ sưu tập', 'Ghi đúng tên bộ sưu tập (không phân biệt chữ hoa/thường). Bắt buộc với sản phẩm mới. Tên chưa có sẽ tự tạo bộ sưu tập mới (sửa ảnh bìa, giá chung ở tab Bộ sưu tập).'],
      ['Giá', 'Số nguyên VNĐ, ví dụ 6564000 hoặc 6.564.000.'],
      ['Nổi bật / Hiển thị', '1 hoặc 0 (có / không).'],
      ['', ''],
      ['ẢNH SẢN PHẨM', ''],
      ['Cách 1 – Tự ghép', 'Để trống cột Ảnh, chọn ảnh đặt tên theo mã kính: F3714.jpg, F3714-2.jpg, F3714-3.jpg… (thứ tự theo số).'],
      ['Cách 2 – Tên file', 'Ghi tên file ảnh vào cột Ảnh, nhiều ảnh cách nhau bằng dấu |   ví dụ: mat-truoc.jpg | mat-ben.jpg'],
      ['Cách 3 – Link', 'Ghi link https://… ảnh trên mạng, máy chủ sẽ tự tải về.'],
      ['Giữ ảnh cũ', 'Để trống cột Ảnh (và không chọn ảnh trùng mã), hoặc giữ nguyên link /resources/… khi xuất ra.'],
      ['Xoá hết ảnh', 'Ghi dấu "-" vào cột Ảnh.'],
      ['', ''],
      ['Cột "Giá đang bán"', 'Chỉ để xem (giá sản phẩm hoặc giá mặc định của bộ sưu tập), không được nhập lại.'],
      ['', ''],
      ['BỘ SƯU TẬP HIỆN CÓ', 'Giá chung'],
      ...collections.map((c) => [c.name, c.default_price ? `${Number(c.default_price).toLocaleString('vi-VN')}đ` : 'Liên hệ']),
    ],
  };
}

const num = (v) => (v === null || v === undefined ? null : Number(v));

function sendXlsx(res, fileName, sheets) {
  const buf = writeXlsx(sheets);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.send(buf);
}

router.get(
  '/export',
  asyncH(async (req, res) => {
    const [collections] = await pool.query('SELECT * FROM collections ORDER BY sort_order, id');
    const [products] = await pool.query(
      `SELECT p.*, c.name AS collection_name, c.default_price
       FROM products p JOIN collections c ON c.id = p.collection_id
       ORDER BY c.sort_order, c.id, p.sort_order, p.id`
    );
    const [res_] = await pool.query('SELECT product_id, file_name FROM resources WHERE product_id IS NOT NULL ORDER BY sort_order, id');
    const imgs = {};
    for (const r of res_) (imgs[r.product_id] ||= []).push(urlOf(r.file_name));

    const rows = [HEADERS];
    for (const p of products) {
      const images = imgs[p.id] || (p.image_url ? [p.image_url] : []);
      rows.push([
        p.code || '',
        p.name,
        p.collection_name,
        p.series || '',
        num(p.price),
        num(p.sale_price),
        p.is_featured ? 1 : 0,
        p.is_active ? 1 : 0,
        p.sort_order,
        p.description || '',
        images.join(' | '),
        num(p.sale_price) ?? num(p.price) ?? num(p.default_price),
      ]);
    }
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    sendXlsx(res, `san-pham-yein-${stamp}.xlsx`, [{ name: 'Sản phẩm', rows, widths: WIDTHS }, guideSheet(collections)]);
  })
);

router.get(
  '/template',
  asyncH(async (req, res) => {
    const [collections] = await pool.query('SELECT * FROM collections ORDER BY sort_order, id');
    const c = collections[0];
    const rows = [HEADERS.slice(0, 11), ['F0001', 'Tên kính ví dụ', c ? c.name : 'Dòng F', '', 6564000, '', 0, 1, 0, '', 'F0001.jpg | F0001-2.jpg']];
    sendXlsx(res, 'mau-nhap-san-pham.xlsx', [{ name: 'Sản phẩm', rows, widths: WIDTHS }, guideSheet(collections)]);
  })
);

/** Parse the uploaded spreadsheet (xlsx or csv). */
function parseSheet(fileName, base64) {
  if (!base64) throw Object.assign(new Error('Chưa có file'), { status: 400 });
  const buf = Buffer.from(String(base64).replace(/^data:[^,]*,/, ''), 'base64');
  if (!buf.length) throw Object.assign(new Error('File rỗng'), { status: 400 });
  const ext = path.extname(String(fileName || '')).toLowerCase();
  try {
    if (ext === '.csv' || ext === '.txt') return readCsv(buf.toString('utf8'));
    if (buf.readUInt32LE(0) !== 0x04034b50) {
      throw new Error(ext === '.xls' ? 'File .xls (Excel 97-2003) chưa hỗ trợ – mở bằng Excel và "Lưu thành" .xlsx' : 'File không phải .xlsx hoặc .csv');
    }
    return readXlsx(buf);
  } catch (err) {
    throw Object.assign(err, { status: 400 });
  }
}

async function loadContext(rows, imageNames) {
  const [collections] = await pool.query('SELECT id, slug, name FROM collections');
  const [products] = await pool.query(
    'SELECT id, code, name, collection_id, series, price, sale_price, is_featured, is_active, sort_order, description, image_url FROM products'
  );
  const [imgs] = await pool.query('SELECT id, product_id, file_name FROM resources WHERE product_id IS NOT NULL ORDER BY sort_order, id');
  const byProduct = {};
  for (const r of imgs) (byProduct[r.product_id] ||= []).push({ id: r.id, url: urlOf(r.file_name) });
  for (const p of products) p.images = byProduct[p.id] || [];

  // resources referenced in the sheet as ".../resources/<file>"
  const names = new Set();
  for (const row of rows) for (const v of row || []) for (const m of String(v ?? '').matchAll(/resources\/([^\s|;/?#]+)/gi)) names.add(m[1]);
  const resources = new Map();
  if (names.size) {
    const [found] = await pool.query('SELECT id, product_id, file_name FROM resources WHERE file_name IN (?)', [[...names]]);
    for (const r of found) resources.set(r.file_name, { id: r.id, product_id: r.product_id });
  }
  return { collections, products, resources, imageNames: Array.isArray(imageNames) ? imageNames.map(String) : [] };
}

const handle = (fn) =>
  asyncH(async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      throw err;
    }
  });

router.post(
  '/preview',
  handle(async (req, res) => {
    const rows = parseSheet(req.body?.fileName, req.body?.data);
    const ctx = await loadContext(rows, req.body?.imageNames);
    const result = analyzeImport(rows, ctx);
    if (!result.rows.length) return res.status(400).json({ error: 'File không có dòng sản phẩm nào' });
    if (result.rows.length > 5000) return res.status(400).json({ error: 'Tối đa 5000 dòng mỗi lần nhập' });
    res.json(result);
  })
);

/** Copy an existing resource file into a new resource (when one image is used by several products). */
async function copyResource(id) {
  const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [id]);
  if (!rows[0]) return null;
  const buf = await fs.readFile(path.join(RESOURCE_DIR, rows[0].file_name));
  return saveBuffer(buf, rows[0].mime, rows[0].original_name);
}

router.post(
  '/commit',
  handle(async (req, res) => {
    const uploaded = new Map(Object.entries(req.body?.uploaded || {}).map(([k, v]) => [k.toLowerCase(), Number(v)]));
    const rows = parseSheet(req.body?.fileName, req.body?.data);
    const ctx = await loadContext(rows, [...uploaded.keys()]);
    const result = analyzeImport(rows, ctx);

    const report = { created: 0, updated: 0, unchanged: 0, skipped: 0, collectionsCreated: [], imageErrors: [], errors: [] };

    // 1) create the collections that do not exist yet
    const newIds = new Map(); // "new:<slug>" -> real id
    if (result.newCollections.length) {
      const [[{ maxSort }]] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM collections');
      let sort = Number(maxSort);
      for (const c of result.newCollections) {
        sort++;
        for (let n = 1; n < 50; n++) {
          const slug = n === 1 ? c.slug : `${c.slug}-${n}`;
          try {
            const [r] = await pool.query('INSERT INTO collections SET ?', [{ slug, name: c.name, is_active: 1, sort_order: sort }]);
            newIds.set(c.id, r.insertId);
            report.collectionsCreated.push({ id: r.insertId, slug, name: c.name });
            break;
          } catch (err) {
            if (err.code !== 'ER_DUP_ENTRY') throw err; // slug taken meanwhile -> try the next suffix
          }
        }
      }
    }
    const usedIds = new Set(); // resource ids already attached during this import

    for (const item of result.rows) {
      if (item.status === 'error') {
        report.skipped++;
        continue;
      }
      if (item.status === 'unchanged') {
        report.unchanged++;
        continue;
      }

      // Resolve images before opening the transaction (downloads can be slow)
      let imageIds;
      let fallback = null;
      if (item.imagePlan === 'clear') imageIds = [];
      if (item.imagePlan === 'replace') {
        imageIds = [];
        for (const im of item.images) {
          try {
            let id = null;
            if (im.kind === 'upload') id = uploaded.get(im.name.toLowerCase()) || null;
            else if (im.kind === 'existing') id = im.id;
            else if (im.kind === 'url') id = (await downloadImage(im.url)).id;
            else if (im.kind === 'static') fallback ||= im.url;
            if (!id) continue;
            if (usedIds.has(id) || im.copy) {
              const copy = await copyResource(id);
              if (!copy) continue;
              id = copy.id;
            }
            usedIds.add(id);
            imageIds.push(id);
          } catch (err) {
            report.imageErrors.push({ row: item.row, code: item.code, image: im.name, error: err.message });
          }
        }
        if (!imageIds.length && !fallback) imageIds = undefined; // nothing usable -> keep current images
      }

      const conn = await pool.getConnection();
      let toDelete = [];
      try {
        await conn.beginTransaction();
        let pid = item.id;
        const data = { ...item.data };
        if (typeof data.collection_id === 'string') {
          data.collection_id = newIds.get(data.collection_id);
          if (!data.collection_id) throw new Error('Không tạo được bộ sưu tập mới');
        }
        if (pid) {
          if (Object.keys(data).length) await conn.query('UPDATE products SET ? WHERE id = ?', [data, pid]);
        } else {
          const [r] = await conn.query('INSERT INTO products SET ?', [data]);
          pid = r.insertId;
        }
        if (imageIds !== undefined) toDelete = await attachImages(conn, pid, imageIds, fallback);
        await conn.commit();
        if (item.id) report.updated++;
        else report.created++;
      } catch (err) {
        await conn.rollback().catch(() => {});
        toDelete = [];
        report.skipped++;
        report.errors.push({
          row: item.row,
          code: item.code,
          error: err.code === 'ER_DUP_ENTRY' ? 'Mã kính đã tồn tại' : err.code === 'ER_NO_REFERENCED_ROW_2' ? 'Bộ sưu tập không tồn tại' : err.message,
        });
      } finally {
        conn.release();
      }
      await deleteFiles(toDelete);
    }
    for (const it of result.rows) if (it.status === 'error') report.errors.push({ row: it.row, code: it.code, error: it.errors.join('; ') });
    report.errors.sort((a, b) => a.row - b.row);
    res.json(report);
  })
);

module.exports = router;
