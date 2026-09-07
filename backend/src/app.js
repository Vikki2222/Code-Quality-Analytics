require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth.routes');
const githubRoutes = require('./routes/github.routes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // required so the session cookie is sent cross-origin
  })
);
app.use(express.json());

// NOTE: MemoryStore (express-session default) is fine for local dev but
// leaks memory and doesn't work across multiple server instances.
// Before Phase 7 (Production), swap this for connect-pg-simple or
// connect-redis so sessions survive restarts and scale horizontally.
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
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

// Central error handler - keeps error shape consistent and avoids
// leaking stack traces to the client in production.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
