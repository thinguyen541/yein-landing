const express = require('express');
const cors = require('cors');
const config = require('./config');
const { waitForDb, migrate, seedAdmin } = require('./db');
const authRoutes = require('./routes/auth');
const { publicRouter, adminRouter } = require('./routes/products');

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/products', publicRouter);
app.use('/api/admin/products', adminRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

(async () => {
  await waitForDb();
  await migrate();
  await seedAdmin();
  app.listen(config.port, () => console.log(`[api] listening on :${config.port}`));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
