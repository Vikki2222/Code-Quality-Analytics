const logger = require('../config/logger');
const { query } = require('../config/db');
const reviewService = require('../services/review.service');
const { enqueueReview } = require('../queues/review.queue');
const userService = require('../services/user.service');

const REVIEW_ACTIONS = ['opened', 'synchronize', 'reopened'];

/**
 * POST /api/webhooks/github (after signature verification).
 *
 * Every path is caught here: this app runs Express 4, which does not
 * catch rejected promises from async handlers - an uncaught throw becomes
 * an unhandled rejection, which exits the Node process.
 */
async function handleGitHubWebhook(req, res) {
  const deliveryId = req.headers['x-github-delivery'];
  const eventType = req.headers['x-github-event'];
  if (!deliveryId || !eventType) {
    return res.status(400).json({ error: 'Missing X-GitHub-Delivery or X-GitHub-Event header' });
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  // Idempotency check: has this exact delivery already been processed?
  // GitHub retries deliveries that time out or 5xx - without this, a
  // slow response could trigger the same review twice.
  try {
    await query('INSERT INTO webhook_deliveries (delivery_id, event_type) VALUES ($1, $2)', [deliveryId, eventType]);
  } catch (err) {
    if (err.code === '23505') {
      // unique_violation - already processed this exact delivery
      return res.status(200).json({ message: 'Already processed' });
    }
    logger.error({ err, deliveryId, eventType }, 'Failed to record webhook delivery');
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Respond to GitHub immediately - webhooks expect a fast ack (GitHub
  // times out around 10s). Any real work happens after responding.
  res.status(200).json({ message: 'Received' });

  if (eventType !== 'pull_request') return;
  if (!REVIEW_ACTIONS.includes(payload.action)) return;

  let reviewId;
  try {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const pullNumber = payload.pull_request.number;

    // Webhooks don't carry a session - we need a real user's access
    // token to call GitHub's API on their behalf. Use the repo owner's
    // account if they've connected it, matched by immutable GitHub id.
    // Org-owned repos have an org as owner, so they never match here.
    const user = await userService.findByGitHubId(payload.repository.owner.id);
    if (!user || !user.github_access_token) {
      logger.warn(
        { owner, repo, deliveryId, reason: user ? 'token_unavailable' : 'no_connected_user' },
        'Webhook received but no usable connected user for repo owner'
      );
      return;
    }

    ({ reviewId } = await reviewService.createQueuedReview({
      userId: user.id,
      accessToken: user.github_access_token,
      owner,
      repo,
      pullNumber,
    }));

    await enqueueReview({ userId: user.id, owner, repo, pullNumber, reviewId });

    logger.info({ reviewId, owner, repo, pullNumber, deliveryId }, 'Webhook triggered review');
  } catch (err) {
    logger.error({ err, deliveryId, reviewId }, 'Webhook-triggered review failed');
    // GitHub already got a 200 and won't retry on its own. Clean up so a
    // manual "Redeliver" from GitHub's webhook settings works, and so the
    // review doesn't sit in 'running' forever.
    await Promise.allSettled([
      query('DELETE FROM webhook_deliveries WHERE delivery_id = $1', [deliveryId]),
      reviewId && reviewService.failReview(reviewId, 'Could not queue review'),
    ]);
  }
}

module.exports = { handleGitHubWebhook };
