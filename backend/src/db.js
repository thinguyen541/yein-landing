const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('./config');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  timezone: 'Z',
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// MySQL in Docker can take a while to accept connections on first boot.
async function waitForDb(retries = 30) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.log(`[db] waiting for MySQL (${i}/${retries}): ${err.code || err.message}`);
      await sleep(2000);
    }
  }
  throw new Error('Could not connect to MySQL');
}

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(15,2) NOT NULL DEFAULT 0,
      sale_price DECIMAL(15,2) NULL,
      image_url VARCHAR(1024),
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active_sort (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

// Creates the first admin from ADMIN_USERNAME / ADMIN_PASSWORD if none exists yet.
async function seedAdmin() {
  const [rows] = await pool.query('SELECT COUNT(*) AS n FROM admins');
  if (rows[0].n > 0) return;
  const { username, password } = config.admin;
  if (!password) {
    console.warn('[db] No admin exists and ADMIN_PASSWORD is empty - skipping admin seed');
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
  console.log(`[db] Created admin account "${username}"`);
}

module.exports = { pool, waitForDb, migrate, seedAdmin };
