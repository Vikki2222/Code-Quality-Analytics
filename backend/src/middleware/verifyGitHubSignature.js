const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Verify the payload actually came from GitHub. GitHub signs the raw
 * request body with your webhook secret (HMAC-SHA256) and sends it in
 * the X-Hub-Signature-256 header - we recompute it and compare.
 * Anyone can POST to a public URL claiming to be GitHub; this is the
 * only thing standing between "a real PR event" and "anyone triggering
 * AI calls and DB writes for free."
 *
 * Requires express.raw() before it so req.body is the exact bytes sent.
 */
function verifyGitHubSignature(req, res, next) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('GITHUB_WEBHOOK_SECRET is not set - rejecting webhook');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  // express.raw only produces a Buffer for application/json; anything else
  // (e.g. a webhook configured as form-encoded) leaves body unparsed.
  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: 'Webhook content type must be application/json' });
  }

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.body).digest('hex');

  // timingSafeEqual prevents a timing attack from leaking the correct
  // signature byte-by-byte - a plain === comparison is exploitable here.
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

module.exports = verifyGitHubSignature;
