const rateLimit = require('express-rate-limit');

// General API rate limit - generous enough for normal use, tight
// enough to block a runaway script or basic abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Stricter limit for review creation specifically - each review
// triggers a Gemini API call and DB writes. Without this, a bug in
// the frontend (e.g. runaway polling that accidentally POSTs instead
// of GETs) could rack up real costs.
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many review requests, please slow down.' },
});

// Auth endpoints get their own limit - prevents credential stuffing
// even though GitHub OAuth means there's no password to stuff here.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts.' },
});

module.exports = { apiLimiter, reviewLimiter, authLimiter };