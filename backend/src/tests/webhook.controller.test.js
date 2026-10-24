jest.mock('../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../services/review.service', () => ({ createQueuedReview: jest.fn() }));
jest.mock('../queues/review.queue', () => ({ enqueueReview: jest.fn() }));
jest.mock('../services/user.service', () => ({ findByGitHubUsername: jest.fn() }));

const { query } = require('../config/db');
const reviewService = require('../services/review.service');
const { enqueueReview } = require('../queues/review.queue');
const userService = require('../services/user.service');
const { handleGitHubWebhook } = require('../controllers/webhook.controller');

const PR_PAYLOAD = {
  action: 'opened',
  repository: { owner: { login: 'octo' }, name: 'repo' },
  pull_request: { number: 7 },
};

function mockReq({ payload = PR_PAYLOAD, raw, headers } = {}) {
  return {
    headers: headers || { 'x-github-delivery': 'delivery-1', 'x-github-event': 'pull_request' },
    body: Buffer.from(raw !== undefined ? raw : JSON.stringify(payload)),
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
  userService.findByGitHubUsername.mockResolvedValue({ id: 3, github_access_token: 'gho_secret' });
  reviewService.createQueuedReview.mockResolvedValue({ reviewId: 11 });
  enqueueReview.mockResolvedValue('job-1');
});

describe('handleGitHubWebhook', () => {
  test('acks 200 and enqueues a review for an opened PR', async () => {
    const res = mockRes();
    await handleGitHubWebhook(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(enqueueReview).toHaveBeenCalledWith({ userId: 3, owner: 'octo', repo: 'repo', pullNumber: 7, reviewId: 11 });
  });

  test('never puts the access token in the queued job', async () => {
    await handleGitHubWebhook(mockReq(), mockRes());
    expect(JSON.stringify(enqueueReview.mock.calls)).not.toContain('gho_secret');
  });

  test('returns 200 "Already processed" for a duplicate delivery', async () => {
    query.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }));
    const res = mockRes();
    await handleGitHubWebhook(mockReq(), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Already processed' });
    expect(enqueueReview).not.toHaveBeenCalled();
  });

  test('returns 500 (does not throw) when the delivery insert fails', async () => {
    query.mockRejectedValue(new Error('connection refused'));
    const res = mockRes();
    await handleGitHubWebhook(mockReq(), res); // a rejection here would fail the test
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('returns 400 for invalid JSON without throwing', async () => {
    const res = mockRes();
    await handleGitHubWebhook(mockReq({ raw: '{not json' }), res); // a rejection here would fail the test
    expect(res.status).toHaveBeenCalledWith(400);
    expect(query).not.toHaveBeenCalled();
  });

  test('returns 400 when delivery/event headers are missing', async () => {
    const res = mockRes();
    await handleGitHubWebhook(mockReq({ headers: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(query).not.toHaveBeenCalled();
  });

  test('ignores non pull_request events after acking', async () => {
    const res = mockRes();
    const req = mockReq({ headers: { 'x-github-delivery': 'd2', 'x-github-event': 'push' } });
    await handleGitHubWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(reviewService.createQueuedReview).not.toHaveBeenCalled();
  });

  test('ignores PR actions that are not opened/synchronize/reopened', async () => {
    await handleGitHubWebhook(mockReq({ payload: { ...PR_PAYLOAD, action: 'closed' } }), mockRes());
    expect(reviewService.createQueuedReview).not.toHaveBeenCalled();
  });

  test('does not throw when review creation fails after the ack', async () => {
    reviewService.createQueuedReview.mockRejectedValue(new Error('GitHub 502'));
    const res = mockRes();
    await handleGitHubWebhook(mockReq(), res); // a rejection here would fail the test
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
