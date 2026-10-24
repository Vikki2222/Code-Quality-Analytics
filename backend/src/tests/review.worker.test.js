jest.mock('../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
jest.mock('../services/review.service', () => ({ processQueuedReview: jest.fn(), failReview: jest.fn() }));
jest.mock('../services/user.service', () => ({ findById: jest.fn() }));

const reviewService = require('../services/review.service');
const userService = require('../services/user.service');
const { processJob } = require('../workers/review.worker');

function job({ attemptsMade = 0, attempts = 2 } = {}) {
  return {
    id: 'job-1',
    attemptsMade,
    opts: { attempts },
    data: { userId: 3, owner: 'octo', repo: 'repo', pullNumber: 7, reviewId: 11 },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  userService.findById.mockResolvedValue({ id: 3, github_access_token: 'decrypted-token' });
  reviewService.processQueuedReview.mockResolvedValue();
});

describe('review worker processJob', () => {
  test('loads the token from the DB rather than job data', async () => {
    await processJob(job());
    expect(userService.findById).toHaveBeenCalledWith(3);
    expect(reviewService.processQueuedReview).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'decrypted-token', reviewId: 11 })
    );
  });

  test('first of two attempts is not final', async () => {
    await processJob(job({ attemptsMade: 0, attempts: 2 }));
    expect(reviewService.processQueuedReview).toHaveBeenCalledWith(expect.objectContaining({ isFinalAttempt: false }));
  });

  test('second of two attempts is final', async () => {
    await processJob(job({ attemptsMade: 1, attempts: 2 }));
    expect(reviewService.processQueuedReview).toHaveBeenCalledWith(expect.objectContaining({ isFinalAttempt: true }));
  });

  test('marks the review failed on the final attempt when the user no longer exists', async () => {
    userService.findById.mockResolvedValue(null);
    await expect(processJob(job({ attemptsMade: 1 }))).rejects.toThrow('User 3 not found');
    expect(reviewService.failReview).toHaveBeenCalledWith(11, 'User 3 not found');
    expect(reviewService.processQueuedReview).not.toHaveBeenCalled();
  });

  test('fails with a re-login message when the stored token cannot be decrypted', async () => {
    userService.findById.mockResolvedValue({ id: 3, github_access_token: null });
    await expect(processJob(job({ attemptsMade: 1 }))).rejects.toThrow(/log in again/);
    expect(reviewService.failReview).toHaveBeenCalledWith(11, expect.stringMatching(/log in again/));
    expect(reviewService.processQueuedReview).not.toHaveBeenCalled();
  });
});
