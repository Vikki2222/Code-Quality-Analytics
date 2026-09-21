require('dotenv').config();

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const helmet = require('helmet');
const passport = require('./config/passport');
const logger = require('./config/logger');
const authRoutes = require('./routes/auth.routes');
const githubRoutes = require('./routes/github.routes');
const reviewRoutes = require('./routes/review.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const webhookRoutes = require('./routes/webhook.routes');
const { pool } = require('./config/db');
const { apiLimiter, reviewLimiter, authLimiter } = require('./middleware/rateLimiter');

const app = express();

app.use(helmet());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.url === '/health') return; // skip healthcheck noise
    logger.info(
      {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        ms: Date.now() - start,
      },
      'Request'
    );
  });
  next();
});
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Webhook route MUST be before express.json() - needs raw body for
// HMAC-SHA256 signature verification.
app.use('/api/webhooks', webhookRoutes);

app.use(express.json());

// connect-pg-simple stores sessions in a `session` table in Postgres.
// Survives server restarts (unlike MemoryStore which loses all sessions
// on every nodemon reload - the root cause of all the cookie-copying
// friction we had earlier in development).
app.use(
  session({
    store: new pgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true, // auto-creates the session table on first boot
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // http://localhost in Docker - secure requires HTTPS
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/', apiLimiter);
app.use('/api/reviews', reviewLimiter);
app.use('/api/auth', authLimiter);

app.use((err, req, res, next) => {
  logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const PORT = parseInt(process.env.PORT, 10) || 4000;
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});

module.exports = app;