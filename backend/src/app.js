require('dotenv').config();
const { validateEnv, API_ENV } = require('./config/env');

validateEnv(API_ENV);

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
const { reviewQueue } = require('./queues/review.queue');
const { runMigrations } = require('./db/migrate');
const { apiLimiter, reviewLimiter, authLimiter } = require('./middleware/rateLimiter');

const app = express();

// Number of reverse proxies in front of Express. 1 locally (nginx);
// 2 on Coolify (Traefik -> nginx). Needed so req.ip is the real client
// (rate limiting keys on it) and req.secure reflects the original HTTPS.
app.set('trust proxy', parseInt(process.env.TRUST_PROXY_HOPS, 10) || 1);

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
// Webhooks are excluded from rate limiting: they're HMAC-verified and all
// arrive from GitHub's IPs, so limiting by IP would drop real deliveries.
app.use('/api/webhooks', webhookRoutes);

// Limiters must be registered BEFORE the routers - Express runs middleware
// in order, and a router that responds never reaches anything after it.
app.use('/api/', apiLimiter);
app.post('/api/reviews', reviewLimiter); // only creation costs AI calls; polling GETs must not hit this
app.use('/api/auth', authLimiter);

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
      // 'auto' = Secure flag whenever the original request was HTTPS
      // (via trusted X-Forwarded-Proto). Works for http://localhost and prod.
      secure: 'auto',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const HEALTH_CHECK_TIMEOUT_MS = 2000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Reports 503 when Postgres or Redis is unreachable, so the container
// healthcheck (and Coolify) see a broken API as unhealthy rather than "ok".
app.get('/health', async (req, res) => {
  const [db, redis] = await Promise.allSettled([
    withTimeout(pool.query('SELECT 1'), HEALTH_CHECK_TIMEOUT_MS),
    withTimeout(
      reviewQueue.client.then((client) => client.ping()),
      HEALTH_CHECK_TIMEOUT_MS
    ),
  ]);
  const status = { db: db.status === 'fulfilled' ? 'ok' : 'error', redis: redis.status === 'fulfilled' ? 'ok' : 'error' };
  const healthy = status.db === 'ok' && status.redis === 'ok';

  if (!healthy) {
    logger.warn({ ...status, dbErr: db.reason, redisErr: redis.reason }, 'Health check failed');
  }
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', ...status });
});

app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((err, req, res, next) => {
  logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const PORT = parseInt(process.env.PORT, 10) || 4000;
const SHUTDOWN_TIMEOUT_MS = 10000;
let server;

async function start() {
  await runMigrations(pool);
  server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  });
}

// On deploy, Docker sends SIGTERM then SIGKILLs after the grace period.
// Stop taking new connections, let in-flight requests finish, then close
// the DB pool and Redis connection.
function shutdown(signal) {
  logger.info({ signal }, 'Shutting down API');
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  if (!server) process.exit(0);
  server.close(async () => {
    await Promise.allSettled([pool.end(), reviewQueue.close()]);
    process.exit(0);
  });
  server.closeIdleConnections();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'Unhandled promise rejection');
  process.exit(1);
});

start().catch((err) => {
  logger.fatal({ err }, 'API failed to start');
  process.exit(1);
});

module.exports = app;