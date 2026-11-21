const express = require('express');
const { pool } = require('../db');
const requireAdmin = require('../middleware/auth');
const { toMoney, toInt, str, asyncH } = require('../util');
const { attachImages, imagesByProduct, deleteFiles } = require('./resources');

// Effective price = product price, or the collection's default price when the product has none.
const PUBLIC_SELECT = `
  SELECT p.id, p.code, p.name, p.series, p.description, p.image_url, p.is_featured, p.sort_order,
         COALESCE(p.price, c.default_price) AS price,
         p.sale_price,
         c.id AS collection_id, c.slug AS collection_slug, c.name AS collection_name
  FROM products p
  JOIN collections c ON c.id = p.collection_id
  WHERE p.is_active = 1 AND c.is_active = 1`;

function parseProduct(body, partial = false) {
  const errors = [];
  const out = {};
  const has = (k) => body[k] !== undefined;

  if (has('name') || !partial) {
    const name = str(body.name);
    if (!name) errors.push('Tên sản phẩm không được để trống');
    else out.name = name;
  }
  // Every product belongs to exactly one collection
  if (has('collection_id') || !partial) {
    const cid = toInt(body.collection_id, 0);
    if (!cid) errors.push('Chọn bộ sưu tập cho sản phẩm');
    else out.collection_id = cid;
  }
  if (has('code')) out.code = str(body.code, 64);
  if (has('series')) out.series = str(body.series, 128);
  if (has('description')) out.description = str(body.description, 5000);
  for (const k of ['price', 'sale_price']) {
    if (!has(k)) continue;
    const m = toMoney(body[k]);
    if (!m.ok) errors.push(k === 'price' ? 'Giá không hợp lệ' : 'Giá khuyến mãi không hợp lệ');
    else out[k] = m.value;
  }
  if (has('image_url')) out.image_url = str(body.image_url, 1024);
  if (has('is_active')) out.is_active = body.is_active ? 1 : 0;
  if (has('is_featured')) out.is_featured = body.is_featured ? 1 : 0;
  if (has('sort_order')) out.sort_order = toInt(body.sort_order);

  const imageIds = Array.isArray(body.image_ids) ? body.image_ids : undefined;
  return { errors, data: out, imageIds };
}

function dbError(err, res) {
  if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Mã kính đã tồn tại' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Bộ sưu tập không tồn tại' });
  return null;
}

async function loadAdminProduct(id) {
  const [rows] = await pool.query(
    `SELECT p.*, c.name AS collection_name, c.default_price AS collection_price
     FROM products p LEFT JOIN collections c ON c.id = p.collection_id WHERE p.id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const imgs = await imagesByProduct([rows[0].id]);
  return { ...rows[0], images: imgs[rows[0].id] || [] };
}

/** Insert or update a product and its images in one transaction. */
async function saveProduct(id, data, imageIds) {
  const conn = await pool.getConnection();
  let toDelete = [];
  try {
    await conn.beginTransaction();
    let pid = id;
    if (pid) {
      if (Object.keys(data).length) {
        const [r] = await conn.query('UPDATE products SET ? WHERE id = ?', [data, pid]);
        if (!r.affectedRows) {
          await conn.rollback();
          return null;
        }
      } else {
        const [r] = await conn.query('SELECT id FROM products WHERE id = ?', [pid]);
        if (!r.length) {
          await conn.rollback();
          return null;
        }
      }
    } else {
      const [r] = await conn.query('INSERT INTO products SET ?', [data]);
      pid = r.insertId;
    }
    if (imageIds !== undefined) toDelete = await attachImages(conn, pid, imageIds, data.image_url);
    await conn.commit();
    await deleteFiles(toDelete);
    return pid;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---- Public ----
const publicRouter = express.Router();

// GET /api/products?featured=1&collection=slug&q=code
publicRouter.get(
  '/',
  asyncH(async (req, res) => {
    const where = [];
    const params = [];
    if (req.query.featured === '1') where.push('p.is_featured = 1');
    if (req.query.collection) {
      where.push('c.slug = ?');
      params.push(String(req.query.collection));
    }
    if (req.query.q) {
      where.push('(p.code LIKE ? OR p.name LIKE ? OR p.series LIKE ?)');
      const q = `%${String(req.query.q).slice(0, 64)}%`;
      params.push(q, q, q);
    }
    const sql = `${PUBLIC_SELECT} ${where.length ? 'AND ' + where.join(' AND ') : ''}
      ORDER BY c.sort_order ASC, p.sort_order ASC, p.id ASC`;
    const [rows] = await pool.query(sql, params);
    const imgs = await imagesByProduct(rows.map((r) => r.id));
    res.json(rows.map((r) => ({ ...r, images: (imgs[r.id] || []).map((i) => i.url) })));
  })
);

publicRouter.get(
  '/:id',
  asyncH(async (req, res) => {
    const [rows] = await pool.query(`${PUBLIC_SELECT} AND p.id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    const imgs = await imagesByProduct([rows[0].id]);
    res.json({ ...rows[0], images: (imgs[rows[0].id] || []).map((i) => i.url) });
  })
);

// ---- Admin ----
const adminRouter = express.Router();
adminRouter.use(requireAdmin);

adminRouter.get(
  '/',
  asyncH(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT p.*, c.name AS collection_name, c.slug AS collection_slug, c.default_price AS collection_price
      FROM products p LEFT JOIN collections c ON c.id = p.collection_id
      ORDER BY c.sort_order ASC, p.sort_order ASC, p.id ASC`);
    const imgs = await imagesByProduct();
    res.json(rows.map((r) => ({ ...r, images: imgs[r.id] || [] })));
  })
);

adminRouter.get(
  '/:id',
  asyncH(async (req, res) => {
    const p = await loadAdminProduct(req.params.id);
    if (!p) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    res.json(p);
  })
);

adminRouter.post(
  '/',
  asyncH(async (req, res) => {
    const { errors, data, imageIds } = parseProduct(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    try {
      const id = await saveProduct(null, data, imageIds);
      res.status(201).json(await loadAdminProduct(id));
    } catch (err) {
      if (!dbError(err, res)) throw err;
    }
  })
);

// Set the same price for many products at once (e.g. a whole series)
adminRouter.put(
  '/bulk-price',
  asyncH(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => toInt(x, 0)).filter((x) => x > 0) : [];
    if (!ids.length) return res.status(400).json({ error: 'Chưa chọn sản phẩm' });
    const m = toMoney(req.body.price);
    if (!m.ok) return res.status(400).json({ error: 'Giá không hợp lệ' });
    const data = { price: m.value };
    if (req.body.sale_price !== undefined) {
      const s = toMoney(req.body.sale_price);
      if (!s.ok) return res.status(400).json({ error: 'Giá khuyến mãi không hợp lệ' });
      data.sale_price = s.value;
    }
    const [r] = await pool.query('UPDATE products SET ? WHERE id IN (?)', [data, ids]);
    res.json({ updated: r.affectedRows });
  })
);

adminRouter.put(
  '/:id',
  asyncH(async (req, res) => {
    const { errors, data, imageIds } = parseProduct(req.body || {}, true);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    if (!Object.keys(data).length && imageIds === undefined) return res.status(400).json({ error: 'Không có dữ liệu cập nhật' });
    try {
      const id = await saveProduct(toInt(req.params.id, 0), data, imageIds);
      if (!id) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
      res.json(await loadAdminProduct(id));
    } catch (err) {
      if (!dbError(err, res)) throw err;
    }
  })
);

adminRouter.delete(
  '/:id',
  asyncH(async (req, res) => {
    const [files] = await pool.query('SELECT file_name FROM resources WHERE product_id = ?', [req.params.id]);
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]); // resources rows cascade
    if (!result.affectedRows) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    await deleteFiles(files.map((f) => f.file_name));
    res.json({ ok: true });
  })
);

module.exports = { publicRouter, adminRouter };
