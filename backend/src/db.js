const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('./config');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  timezone: 'Z',
  charset: 'utf8mb4',
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

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function addColumn(table, column, ddl) {
  if (!(await columnExists(table, column))) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
    console.log(`[db] added ${table}.${column}`);
  }
}

async function addConstraint(table, name, ddl) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [table, name]
  );
  if (!rows.length) {
    await pool.query(`ALTER TABLE \`${table}\` ${ddl}`);
    console.log(`[db] added ${name}`);
  }
}

async function addIndex(table, name, ddl) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, name]
  );
  if (rows.length) return;
  try {
    await pool.query(`ALTER TABLE \`${table}\` ${ddl}`);
    console.log(`[db] added ${name}`);
  } catch (err) {
    console.warn(`[db] could not add ${name}: ${err.message}`);
  }
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
    CREATE TABLE IF NOT EXISTS collections (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(128) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      tagline VARCHAR(255),
      description TEXT,
      cover_image VARCHAR(1024),
      default_price DECIMAL(15,2) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(15,2) NULL,
      sale_price DECIMAL(15,2) NULL,
      image_url VARCHAR(1024),
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active_sort (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // v2 columns (safe to run on databases created by v1)
  await addColumn('products', 'code', '`code` VARCHAR(64) NULL AFTER `id`');
  await addColumn('products', 'collection_id', '`collection_id` INT UNSIGNED NULL AFTER `code`');
  await addColumn('products', 'is_featured', '`is_featured` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`');
  await addColumn('products', 'series', '`series` VARCHAR(128) NULL AFTER `name`');
  // price may be empty -> falls back to the collection's default price
  await pool.query('ALTER TABLE products MODIFY price DECIMAL(15,2) NULL');

  // Products must point to an existing collection
  await pool.query(`UPDATE products p LEFT JOIN collections c ON c.id = p.collection_id
                    SET p.collection_id = NULL WHERE p.collection_id IS NOT NULL AND c.id IS NULL`);
  await addConstraint(
    'products',
    'fk_products_collection',
    'ADD CONSTRAINT fk_products_collection FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE RESTRICT'
  );
  await addIndex('products', 'uq_products_code', 'ADD UNIQUE INDEX uq_products_code (code)');

  // Product images: files live in RESOURCE_DIR, one row per file
  await pool.query(`
    CREATE TABLE IF NOT EXISTS resources (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      product_id INT UNSIGNED NULL,
      file_name VARCHAR(255) NOT NULL UNIQUE,
      original_name VARCHAR(255),
      mime VARCHAR(64),
      size INT UNSIGNED,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_resources_product (product_id, sort_order),
      CONSTRAINT fk_resources_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      k VARCHAR(64) PRIMARY KEY,
      v TEXT
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

// Company info from the YEIN catalogue; only fills settings that are still empty
const DEFAULT_SETTINGS = {
  company_name: 'Công ty TNHH CEKO Optics Việt Nam',
  tax_code: '2301375729',
  hotline: '0789061830',
  zalo: '0869809594',
  email: 'cekooptics.sale@gmail.com',
  address: 'Tầng 2 LK16, Khu Đại Hoàng Long, Phường Võ Cường, TP Bắc Ninh, Việt Nam',
  facebook: '',
  working_hours: '',
  // One option per line: "Name | extra price"
  lens_options: [
    'Tròng 1.60 blue cut SHMC | 500000',
    'Tròng 1.67 blue cut SHMC | 500000',
    'Tròng đổi màu | 500000',
    'Tròng 1.74 | 1500000',
  ].join('\n'),
};

// Products & collections are loaded with scripts/import-catalog.mjs (see README); only settings are seeded here
async function seedDefaults() {
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await pool.query('INSERT IGNORE INTO settings (k, v) VALUES (?, ?)', [k, v]);
    await pool.query("UPDATE settings SET v = ? WHERE k = ? AND (v IS NULL OR v = '')", [v, k]);
  }
  // Zalo number changed: replace the previous default (a number set by hand in admin is kept)
  await pool.query("UPDATE settings SET v = ? WHERE k = 'zalo' AND v = '0789061830'", [DEFAULT_SETTINGS.zalo]);
}

module.exports = { pool, waitForDb, migrate, seedAdmin, seedDefaults };
