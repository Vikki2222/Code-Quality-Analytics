const { Queue } = require('bullmq');

const connection = {
  url: process.env.REDIS_URL,
};

// Single shared queue for review jobs. The controller adds jobs here;
// review.worker.js (a separate process) consumes them.
const reviewQueue = new Queue('review-analysis', { connection });

/**
 * Enqueue a review job. Returns the BullMQ job id immediately - the
 * actual GitHub fetch + AI call happen later, in the worker process.
 */
async function enqueueReview({ userId, accessToken, owner, repo, pullNumber, reviewId }) {
  const job = await reviewQueue.add(
      'analyze-pr',
      { userId, accessToken, owner, repo, pullNumber, reviewId },
      {
          attempts: 2,
          backoff: { type: 'exponential', delay: 30000 }, // 30s, 60s between retries
          removeOnComplete: 100,
          removeOnFail: 500,
      }
  );
  return job.id;
}

module.exports = { reviewQueue, enqueueReview };