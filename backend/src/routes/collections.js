const express = require('express');
const { pool } = require('../db');
const requireAdmin = require('../middleware/auth');
const { toMoney, toInt, str, slugify, asyncH } = require('../util');

function parseCollection(body, partial = false) {
  const errors = [];
  const out = {};
  const has = (k) => body[k] !== undefined;

  if (has('name') || !partial) {
    const name = str(body.name);
    if (!name) errors.push('Tên bộ sưu tập không được để trống');
    else out.name = name;
  }
  if (has('slug') || (!partial && out.name)) {
    const slug = slugify(body.slug || out.name);
    if (!slug) errors.push('Đường dẫn (slug) không hợp lệ');
    else out.slug = slug;
  }
  if (has('tagline')) out.tagline = str(body.tagline);
  if (has('description')) out.description = str(body.description, 5000);
  if (has('cover_image')) out.cover_image = str(body.cover_image, 1024);
  if (has('default_price')) {
    const m = toMoney(body.default_price);
    if (!m.ok) errors.push('Giá mặc định không hợp lệ');
    else out.default_price = m.value;
  }
  if (has('is_active')) out.is_active = body.is_active ? 1 : 0;
  if (has('sort_order')) out.sort_order = toInt(body.sort_order);
  return { errors, data: out };
}

const dupSlug = (err, res) => {
  if (err.code === 'ER_DUP_ENTRY') {
    res.status(400).json({ error: 'Đường dẫn (slug) đã tồn tại' });
    return true;
  }
  return false;
};

// ---- Public ----
const publicRouter = express.Router();

// List with product count + a few preview images
publicRouter.get(
  '/',
  asyncH(async (req, res) => {
    const [cols] = await pool.query(`
      SELECT c.id, c.slug, c.name, c.tagline, c.description, c.cover_image, c.default_price, c.sort_order,
             (SELECT COUNT(*) FROM products p WHERE p.collection_id = c.id AND p.is_active = 1) AS product_count,
             (SELECT MIN(COALESCE(p.price, c.default_price)) FROM products p WHERE p.collection_id = c.id AND p.is_active = 1) AS min_price,
             (SELECT MAX(COALESCE(p.price, c.default_price)) FROM products p WHERE p.collection_id = c.id AND p.is_active = 1) AS max_price
      FROM collections c WHERE c.is_active = 1
      ORDER BY c.sort_order ASC, c.id ASC`);
    if (cols.length) {
      const [prev] = await pool.query(
        `SELECT id, code, name, series, image_url, collection_id, COALESCE(price, 0) AS price FROM products
         WHERE is_active = 1 AND collection_id IN (?)
         ORDER BY is_featured DESC, sort_order ASC, id ASC`,
        [cols.map((c) => c.id)]
      );
      for (const c of cols) c.preview = prev.filter((p) => p.collection_id === c.id).slice(0, 4);
    }
    res.json(cols);
  })
);

publicRouter.get(
  '/:slug',
  asyncH(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT id, slug, name, tagline, description, cover_image, default_price
       FROM collections WHERE slug = ? AND is_active = 1`,
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy bộ sưu tập' });
    res.json(rows[0]);
  })
);

// ---- Admin ----
const adminRouter = express.Router();
adminRouter.use(requireAdmin);

adminRouter.get(
  '/',
  asyncH(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.collection_id = c.id) AS product_count
      FROM collections c ORDER BY c.sort_order ASC, c.id ASC`);
    res.json(rows);
  })
);

adminRouter.post(
  '/',
  asyncH(async (req, res) => {
    const { errors, data } = parseCollection(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    try {
      const [r] = await pool.query('INSERT INTO collections SET ?', [data]);
      const [rows] = await pool.query('SELECT * FROM collections WHERE id = ?', [r.insertId]);
      res.status(201).json(rows[0]);
    } catch (err) {
      if (!dupSlug(err, res)) throw err;
    }
  })
);

adminRouter.put(
  '/:id',
  asyncH(async (req, res) => {
    const { errors, data } = parseCollection(req.body || {}, true);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Không có dữ liệu cập nhật' });
    try {
      const [r] = await pool.query('UPDATE collections SET ? WHERE id = ?', [data, req.params.id]);
      if (!r.affectedRows) return res.status(404).json({ error: 'Không tìm thấy bộ sưu tập' });
      const [rows] = await pool.query('SELECT * FROM collections WHERE id = ?', [req.params.id]);
      res.json(rows[0]);
    } catch (err) {
      if (!dupSlug(err, res)) throw err;
    }
  })
);

adminRouter.delete(
  '/:id',
  asyncH(async (req, res) => {
    // Every product must belong to a collection: refuse while it still has products
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM products WHERE collection_id = ?', [req.params.id]);
    if (n > 0)
      return res.status(400).json({ error: `Bộ sưu tập còn ${n} sản phẩm. Chuyển hoặc xoá các sản phẩm này trước.` });
    const [r] = await pool.query('DELETE FROM collections WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Không tìm thấy bộ sưu tập' });
    res.json({ ok: true });
  })
);

module.exports = { publicRouter, adminRouter };
