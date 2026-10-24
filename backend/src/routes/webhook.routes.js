const express = require('express');
const verifyGitHubSignature = require('../middleware/verifyGitHubSignature');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

// express.raw() gives req.body as a Buffer (not parsed JSON) - required
// for signature verification to work against the exact bytes GitHub sent.
router.post(
  '/github',
  express.raw({ type: 'application/json' }),
  verifyGitHubSignature,
  webhookController.handleGitHubWebhook
);

module.exports = router;
