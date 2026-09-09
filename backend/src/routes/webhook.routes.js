const express = require('express');
const crypto = require('crypto');
const { query } = require('../config/db');
const reviewService = require('../services/review.service');
const { enqueueReview } = require('../queues/review.queue');
const userService = require('../services/user.service');

const router = express.Router();

/**
 * Verify the payload actually came from GitHub. GitHub signs the raw
 * request body with your webhook secret (HMAC-SHA256) and sends it in
 * the X-Hub-Signature-256 header - we recompute it and compare.
 * Anyone can POST to a public URL claiming to be GitHub; this is the
 * only thing standing between "a real PR event" and "anyone triggering
 * AI calls and DB writes for free."
 */
function verifySignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET).update(req.body).digest('hex');

  // timingSafeEqual prevents a timing attack from leaking the correct
  // signature byte-by-byte - a plain === comparison is exploitable here.
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

// express.raw() gives req.body as a Buffer (not parsed JSON) - required
// for signature verification to work against the exact bytes GitHub sent.
router.post('/github', express.raw({ type: 'application/json' }), verifySignature, async (req, res) => {
  const deliveryId = req.headers['x-github-delivery'];
  const eventType = req.headers['x-github-event'];
  const payload = JSON.parse(req.body.toString('utf8'));

  // Idempotency check: has this exact delivery already been processed?
  // GitHub retries deliveries that time out or 5xx - without this, a
  // slow response could trigger the same review twice.
  try {
    await query('INSERT INTO webhook_deliveries (delivery_id, event_type) VALUES ($1, $2)', [
      deliveryId,
      eventType,
    ]);
  } catch (err) {
    if (err.code === '23505') {
      // unique_violation - already processed this exact delivery
      return res.status(200).json({ message: 'Already processed' });
    }
    throw err;
  }

  // Respond to GitHub immediately - webhooks expect a fast ack (GitHub
  // times out around 10s). Any real work happens after responding.
  res.status(200).json({ message: 'Received' });

  if (eventType !== 'pull_request') return;
  if (!['opened', 'synchronize', 'reopened'].includes(payload.action)) return;

  try {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const pullNumber = payload.pull_request.number;

    // Webhooks don't carry a session - we need a real user's access
    // token to call GitHub's API on their behalf. Use the repo owner's
    // account if they've connected it; this is a simplification worth
    // being upfront about (see note below the code).
    const user = await userService.findByGitHubUsername(owner);
    if (!user) {
      console.warn(`Webhook for ${owner}/${repo} - no matching connected user, skipping`);
      return;
    }

    const { reviewId } = await reviewService.createQueuedReview({
      userId: user.id,
      accessToken: user.github_access_token,
      owner,
      repo,
      pullNumber,
    });

    await enqueueReview({
      userId: user.id,
      accessToken: user.github_access_token,
      owner,
      repo,
      pullNumber,
      reviewId,
    });

    console.log(`Webhook triggered review ${reviewId} for ${owner}/${repo}#${pullNumber}`);
  } catch (err) {
    console.error('Webhook-triggered review failed:', err.message);
  }
});

module.exports = router;
