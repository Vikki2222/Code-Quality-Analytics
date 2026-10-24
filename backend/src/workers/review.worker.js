require('dotenv').config();
const { Worker } = require('bullmq');
const logger = require('../config/logger');
const reviewService = require('../services/review.service');
const userService = require('../services/user.service');

const connection = {
  url: process.env.REDIS_URL,
};

/**
 * Runs as its own process (npm run worker), separate from the API
 * server. Pulls jobs off the review-analysis queue and runs the exact
 * same pipeline that used to run synchronously inside the request.
 */
async function processJob(job) {
  const { userId, owner, repo, pullNumber, reviewId } = job.data;
  logger.info({ jobId: job.id, owner, repo, pullNumber, reviewId }, 'Processing review job');

  // attemptsMade counts previous failed attempts, so this is the last
  // try when it's attempts - 1. Only then is the review marked failed.
  const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);

  const user = await userService.findById(userId);
  if (!user) {
    const err = new Error(`User ${userId} not found`);
    if (isFinalAttempt) await reviewService.failReview(reviewId, err.message);
    throw err;
  }

  await reviewService.processQueuedReview({
    reviewId,
    userId,
    accessToken: user.github_access_token,
    owner,
    repo,
    pullNumber,
    isFinalAttempt,
  });
}

if (require.main === module) {
  const worker = new Worker('review-analysis', processJob, {
    connection,
    concurrency: 2, // process up to 2 reviews at once - conservative given free-tier AI rate limits
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Review job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, reviewId: job?.data?.reviewId, attemptsMade: job?.attemptsMade, err }, 'Review job failed');
  });

  logger.info('Review worker started, waiting for jobs...');
}

module.exports = { processJob };
