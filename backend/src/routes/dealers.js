const express = require('express');
const { pool } = require('../db');
const requireAdmin = require('../middleware/auth');
const { toInt, str, asyncH } = require('../util');

const PUBLIC_FIELDS = 'id, name, province, address, phone, zalo, map_url, opening_hours, note';

function parseDealer(body, partial = false) {
  const errors = [];
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (has('name') || !partial) {
    const name = str(body.name);
    if (!name) errors.push('Tên đại lý không được để trống');
    else out.name = name;
  }
  if (has('province')) out.province = str(body.province, 128);
  if (has('address')) out.address = str(body.address, 512);
  if (has('phone')) out.phone = str(body.phone, 64);
  if (has('zalo')) out.zalo = str(body.zalo, 255);
  if (has('map_url')) {
    const u = str(body.map_url, 1024);
    if (u && !/^https?:\/\//i.test(u)) errors.push('Link bản đồ phải bắt đầu bằng http(s)://');
    else out.map_url = u;
  }
  if (has('opening_hours')) out.opening_hours = str(body.opening_hours);
  if (has('note')) out.note = str(body.note, 512);
  if (has('is_active')) out.is_active = body.is_active ? 1 : 0;
  if (has('sort_order')) out.sort_order = toInt(body.sort_order);
  return { errors, data: out };
}

// ---- Public ----
const publicRouter = express.Router();
publicRouter.get(
  '/',
  asyncH(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM dealers WHERE is_active = 1 ORDER BY sort_order ASC, province ASC, name ASC`
    );
    res.json(rows);
  })
);

// ---- Admin ----
const adminRouter = express.Router();
adminRouter.use(requireAdmin);

adminRouter.get(
  '/',
  asyncH(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM dealers ORDER BY sort_order ASC, province ASC, name ASC');
    res.json(rows);
  })
);

adminRouter.post(
  '/',
  asyncH(async (req, res) => {
    const { errors, data } = parseDealer(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    const [r] = await pool.query('INSERT INTO dealers SET ?', [data]);
    const [rows] = await pool.query('SELECT * FROM dealers WHERE id = ?', [r.insertId]);
    res.status(201).json(rows[0]);
  })
);

adminRouter.put(
  '/:id',
  asyncH(async (req, res) => {
    const { errors, data } = parseDealer(req.body || {}, true);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Không có dữ liệu cập nhật' });
    const [r] = await pool.query('UPDATE dealers SET ? WHERE id = ?', [data, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Không tìm thấy đại lý' });
    const [rows] = await pool.query('SELECT * FROM dealers WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  })
);

adminRouter.delete(
  '/:id',
  asyncH(async (req, res) => {
    const [r] = await pool.query('DELETE FROM dealers WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Không tìm thấy đại lý' });
    res.json({ ok: true });
  })
);

module.exports = { publicRouter, adminRouter };
