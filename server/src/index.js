const express = require('express');
const cors    = require('cors');
require('dotenv').config();

// Production security hardening
// Run: npm install helmet express-rate-limit
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./utils/errorHandler');
const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
// FIX: Wildcard CORS was used before (cors() with no options = allow all origins).
// In production, restrict to your actual frontend URL via CORS_ORIGIN env var.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' })); // JSON bodies only for non-upload routes

// ─── Global rate limiting ─────────────────────────────────────────────────────
// 200 requests per IP per 15 minutes — prevents scraping and brute-force.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',   authLimiter, require('./routes/auth.routes'));
app.use('/api/songs',              require('./routes/songs.routes'));
app.use('/api/search',             require('./routes/search.routes'));
app.use('/api/users',              require('./routes/users.routes'));

// Health check (useful for load balancers / uptime monitors)
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ─── Global error handler — MUST be last ─────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));