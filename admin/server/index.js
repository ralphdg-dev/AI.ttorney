// admin/server/index.js
const path = require('path');
const dotenv = require('dotenv');

// Load env: try ENV_PATH, then .env.local, then .env
let loadedFrom = null;
if (process.env.ENV_PATH) {
  const result = dotenv.config({ path: process.env.ENV_PATH });
  if (!result.error) loadedFrom = process.env.ENV_PATH;
}
if (!loadedFrom) {
  const p = path.resolve(process.cwd(), '.env.local');
  const result = dotenv.config({ path: p });
  if (!result.error) loadedFrom = '.env.local';
}
if (!loadedFrom) {
  const p = path.resolve(process.cwd(), '.env');
  const result = dotenv.config({ path: p });
  if (!result.error) loadedFrom = '.env';
}
// Try loading from server/ envs as fallback
if (!loadedFrom) {
  const p = path.resolve(process.cwd(), '../server/.env.development');
  const result = dotenv.config({ path: p });
  if (!result.error) loadedFrom = '../server/.env.development';
}
if (!loadedFrom) {
  const p = path.resolve(process.cwd(), '../server/.env');
  const result = dotenv.config({ path: p });
  if (!result.error) loadedFrom = '../server/.env';
}
if (loadedFrom) {
  // eslint-disable-next-line no-console
  console.log(`[env] Loaded configuration from ${loadedFrom}`);
} else {
  // eslint-disable-next-line no-console
  console.warn('[env] No env file loaded. Ensure .env.local exists in admin/');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { supabase, supabaseAdmin } = require('./routes/config/supabaseClient');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');

const PORT = process.env.PORT || 5001;
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test Supabase Admin auth (non-sensitive)
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;

    res.json({
      status: 'healthy',
      service: 'admin-express',
      supabase: 'connected',
      users_sample_count: data?.users?.length ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});

// Routes
app.use('/api/admin', requireAuth, adminRoutes);
app.use('/api/auth', authRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Admin API listening on http://localhost:${PORT}`);
});
