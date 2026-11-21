const fs = require('fs');
const path = require('path');

// Local run: load the project's .env automatically (repo root, then backend/).
// Variables already set (Docker / shell) are never overwritten.
for (const file of [path.join(__dirname, '..', '..', '.env'), path.join(__dirname, '..', '.env')]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#') || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const required = (name, fallback) => {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '')
    throw new Error(`Missing env var ${name}. Tạo file .env ở thư mục gốc project (copy từ .env.example hoặc chạy scripts\\setup-local-mysql.bat).`);
  return v;
};

module.exports = {
  port: Number(process.env.PORT || 4000),
  db: {
    host: required('DB_HOST', '127.0.0.1'),
    port: Number(process.env.DB_PORT || 3306),
    user: required('DB_USER', 'yein'),
    password: required('DB_PASSWORD', ''),
    database: required('DB_NAME', 'yein'),
  },
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || '',
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
