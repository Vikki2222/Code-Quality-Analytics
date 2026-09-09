require('dotenv').config();
const { Worker } = require('bullmq');
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
    console.log(`Processing review job ${job.id} for ${owner}/${repo}#${pullNumber}`);

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
  console.log(`Review job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Review job ${job?.id} failed:`, err.message);
});

console.log('Review worker started, waiting for jobs...');