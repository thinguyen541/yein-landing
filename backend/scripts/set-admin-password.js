/**
 * Set (or create) an admin account password in the database and keep .env in sync.
 *   cd backend
 *   node scripts/set-admin-password.js <new password> [username=admin]
 * Uses DB settings from the project .env (or environment variables in Docker).
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const config = require('../src/config');

async function main() {
  const [password, username = 'admin'] = process.argv.slice(2);
  if (!password || password.length < 8) {
    console.error('Cách dùng: node scripts/set-admin-password.js <mật khẩu mới, tối thiểu 8 ký tự> [tài khoản=admin]');
    process.exit(1);
  }

  const conn = await mysql.createConnection(config.db);
  const hash = await bcrypt.hash(password, 10);
  const [r] = await conn.query('UPDATE admins SET password_hash = ? WHERE username = ?', [hash, username]);
  if (r.affectedRows) console.log(`Đã đổi mật khẩu cho tài khoản "${username}" trong database.`);
  else {
    await conn.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
    console.log(`Chưa có tài khoản "${username}" - đã tạo mới.`);
  }
  await conn.end();

  // Keep ADMIN_USERNAME / ADMIN_PASSWORD in the project .env in sync (used by scripts/import-catalog.mjs)
  const envFile = path.join(__dirname, '..', '..', '.env');
  if (fs.existsSync(envFile)) {
    let text = fs.readFileSync(envFile, 'utf8');
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const set = (key, value) => {
      const re = new RegExp(`^${key}=.*$`, 'm');
      text = re.test(text) ? text.replace(re, () => `${key}=${value}`) : text.replace(/\s*$/, '') + eol + `${key}=${value}` + eol;
    };
    set('ADMIN_USERNAME', username);
    set('ADMIN_PASSWORD', password);
    fs.writeFileSync(envFile, text);
    console.log('Đã cập nhật ADMIN_PASSWORD trong .env');
  }
}

main().catch((err) => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});
