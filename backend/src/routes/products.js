const express = require('express');
const { pool } = require('../db');
const requireAdmin = require('../middleware/auth');

const PUBLIC_FIELDS = 'id, name, description, price, sale_price, image_url, sort_order';

function parseProduct(body, partial = false) {
  const errors = [];
  const out = {};
  const has = (k) => body[k] !== undefined;

  if (has('name') || !partial) {
    const name = String(body.name ?? '').trim();
    if (!name) errors.push('Tên sản phẩm không được để trống');
    else out.name = name.slice(0, 255);
  }
  if (has('description')) out.description = body.description == null ? null : String(body.description);
  if (has('price') || !partial) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) errors.push('Giá không hợp lệ');
    else out.price = price;
  }
  if (has('sale_price')) {
    if (body.sale_price === null || body.sale_price === '') out.sale_price = null;
    else {
      const sp = Number(body.sale_price);
      if (!Number.isFinite(sp) || sp < 0) errors.push('Giá khuyến mãi không hợp lệ');
      else out.sale_price = sp;
    }
  }
  if (has('image_url')) out.image_url = body.image_url ? String(body.image_url).slice(0, 1024) : null;
  if (has('is_active')) out.is_active = body.is_active ? 1 : 0;
  if (has('sort_order')) out.sort_order = Number.parseInt(body.sort_order, 10) || 0;

  return { errors, data: out };
}

// ---- Public ----
const publicRouter = express.Router();

publicRouter.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM products WHERE is_active = 1 ORDER BY sort_order ASC, id DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ---- Admin ----
const adminRouter = express.Router();
adminRouter.use(requireAdmin);

adminRouter.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY sort_order ASC, id DESC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/', async (req, res, next) => {
  try {
    const { errors, data } = parseProduct(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    const [result] = await pool.query('INSERT INTO products SET ?', [data]);
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/:id', async (req, res, next) => {
  try {
    const { errors, data } = parseProduct(req.body || {}, true);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Không có dữ liệu cập nhật' });
    const [result] = await pool.query('UPDATE products SET ? WHERE id = ?', [data, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = { publicRouter, adminRouter };
