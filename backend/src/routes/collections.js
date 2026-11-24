const express = require('express');
const { pool } = require('../db');
const requireAdmin = require('../middleware/auth');
const { toMoney, toInt, str, slugify, asyncH } = require('../util');
const { deleteFiles } = require('./resources');

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

// POST /api/admin/collections/bulk-delete  { ids: [...], withProducts: bool }
// Without withProducts, collections that still have products are skipped (and reported).
adminRouter.post(
  '/bulk-delete',
  asyncH(async (req, res) => {
    const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).map(Number).filter((n) => n > 0))];
    if (!ids.length) return res.status(400).json({ error: 'Chưa chọn bộ sưu tập nào' });
    const withProducts = !!req.body?.withProducts;
    const [counts] = await pool.query(
      `SELECT c.id, c.name, COUNT(p.id) AS n FROM collections c LEFT JOIN products p ON p.collection_id = c.id
       WHERE c.id IN (?) GROUP BY c.id, c.name`,
      [ids]
    );
    const skipped = withProducts ? [] : counts.filter((c) => c.n > 0).map((c) => ({ id: c.id, name: c.name, products: Number(c.n) }));
    const del = counts.filter((c) => withProducts || !(c.n > 0)).map((c) => c.id);
    let files = [];
    let products = 0;
    if (del.length) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        if (withProducts) {
          const [f] = await conn.query(
            'SELECT r.file_name FROM resources r JOIN products p ON p.id = r.product_id WHERE p.collection_id IN (?)',
            [del]
          );
          files = f.map((x) => x.file_name);
          const [r] = await conn.query('DELETE FROM products WHERE collection_id IN (?)', [del]); // resources cascade
          products = r.affectedRows;
        }
        await conn.query('DELETE FROM collections WHERE id IN (?)', [del]);
        await conn.commit();
      } catch (err) {
        await conn.rollback().catch(() => {});
        throw err;
      } finally {
        conn.release();
      }
      await deleteFiles(files);
    }
    res.json({ deleted: del.length, products, skipped });
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
