const express = require('express');
const { pool } = require('../db');
const requireAdmin = require('../middleware/auth');
const { asyncH } = require('../util');

const KEYS = ['company_name', 'tax_code', 'hotline', 'zalo', 'email', 'address', 'facebook', 'working_hours', 'lens_options'];

async function readAll() {
  const [rows] = await pool.query('SELECT k, v FROM settings WHERE k IN (?)', [KEYS]);
  const out = Object.fromEntries(KEYS.map((k) => [k, '']));
  for (const r of rows) out[r.k] = r.v ?? '';
  return out;
}

const publicRouter = express.Router();
publicRouter.get('/', asyncH(async (req, res) => res.json(await readAll())));

const adminRouter = express.Router();
adminRouter.use(requireAdmin);
adminRouter.put(
  '/',
  asyncH(async (req, res) => {
    const body = req.body || {};
    for (const k of KEYS) {
      if (body[k] === undefined) continue;
      await pool.query('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [
        k,
        String(body[k] ?? '').slice(0, 4000),
      ]);
    }
    res.json(await readAll());
  })
);

module.exports = { publicRouter, adminRouter };
