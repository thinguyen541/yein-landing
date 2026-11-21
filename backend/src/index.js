const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { waitForDb, migrate, seedAdmin, seedDefaults } = require('./db');
const authRoutes = require('./routes/auth');
const products = require('./routes/products');
const collections = require('./routes/collections');
const settings = require('./routes/settings');
const resources = require('./routes/resources');

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));

// Image upload routes have their own larger body limit, so mount them before the global JSON parser
app.use('/api/admin/resources', resources.router);
app.use('/api/admin/upload', resources.router); // old path, same handler
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/products', products.publicRouter);
app.use('/api/collections', collections.publicRouter);
app.use('/api/settings', settings.publicRouter);
app.use('/api/admin/products', products.adminRouter);
app.use('/api/admin/collections', collections.adminRouter);
app.use('/api/admin/settings', settings.adminRouter);

// Product images (in Docker nginx serves the same folder)
app.use('/resources', express.static(resources.RESOURCE_DIR, { maxAge: '7d' }));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Local run without Docker: serve the built Vue app (frontend/dist) too.
// In Docker, nginx does this instead. During FE development use `npm run dev` in frontend/ (Vite, port 5173).
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
  app.use(express.static(FRONTEND_DIST));
  // Vue Router history mode: any other GET -> index.html
  app.get(/^(?!\/api\/|\/resources\/).*/, (req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
  console.log(`[web] serving frontend from ${FRONTEND_DIST}`);
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Dữ liệu quá lớn' });
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

(async () => {
  await waitForDb();
  await migrate();
  await seedAdmin();
  await seedDefaults();
  await resources.cleanupOrphans().catch((e) => console.warn('[resources] cleanup failed:', e.message));
  app.listen(config.port, () => console.log(`[api] listening on :${config.port}`));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
