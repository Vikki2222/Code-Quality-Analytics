require('dotenv').config();
const { Worker } = require('bullmq');
const logger = require('../config/logger');
const reviewService = require('../services/review.service');

const connection = {
  url: process.env.REDIS_URL,
};

/**
 * Runs as its own process (npm run worker), separate from the API
 * server. Pulls jobs off the review-analysis queue and runs the exact
 * same pipeline that used to run synchronously inside the request.
 */
const worker = new Worker(
  'review-analysis',
  async (job) => {
    const { userId, accessToken, owner, repo, pullNumber, reviewId } = job.data;
    logger.info({ jobId: job.id, owner, repo, pullNumber, reviewId }, 'Processing review job');

    await reviewService.processQueuedReview({
      reviewId,
      userId,
      accessToken,
      owner,
      repo,
      pullNumber,
    });
  },
  { connection, concurrency: 2 } // process up to 2 reviews at once - conservative given free-tier AI rate limits
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Review job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Review job failed');
});

logger.info('Review worker started, waiting for jobs...');