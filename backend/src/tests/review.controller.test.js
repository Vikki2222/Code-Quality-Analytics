jest.mock('../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../services/review.service', () => ({ createQueuedReview: jest.fn(), failReview: jest.fn() }));
jest.mock('../queues/review.queue', () => ({ enqueueReview: jest.fn() }));
jest.mock('../services/github.service', () => ({ canAccessRepository: jest.fn() }));

const { query } = require('../config/db');
const reviewService = require('../services/review.service');
const { enqueueReview } = require('../queues/review.queue');
const githubService = require('../services/github.service');
const { accessCache } = require('../middleware/requireRepoAccess');
const { createReview, getReview } = require('../controllers/review.controller');

const USER = { id: 1, github_access_token: 'tok' };

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  accessCache.clear();
  reviewService.createQueuedReview.mockResolvedValue({ reviewId: 9 });
  enqueueReview.mockResolvedValue('job');
});

describe('createReview', () => {
  test.each([
    [{ owner: 'o', repo: 'r' }],
    [{ owner: 'o', repo: 'r', pullNumber: 0 }],
    [{ owner: 'o', repo: 'r', pullNumber: 'abc' }],
    [{ owner: '../x', repo: 'r', pullNumber: 1 }],
    [undefined],
  ])('rejects invalid body %p with 400', async (body) => {
    const res = mockRes();
    await createReview({ body, user: USER }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(reviewService.createQueuedReview).not.toHaveBeenCalled();
  });

  test('queues a valid review and returns 202', async () => {
    const res = mockRes();
    await createReview({ body: { owner: 'o', repo: 'r', pullNumber: 5 }, user: USER }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(202);
    expect(enqueueReview).toHaveBeenCalledWith({ userId: 1, owner: 'o', repo: 'r', pullNumber: 5, reviewId: 9 });
  });

  test('marks the review failed when queueing fails', async () => {
    const err = new Error('Redis down');
    enqueueReview.mockRejectedValue(err);
    const next = jest.fn();
    await createReview({ body: { owner: 'o', repo: 'r', pullNumber: 5 }, user: USER }, mockRes(), next);
    expect(reviewService.failReview).toHaveBeenCalledWith(9, 'Could not queue review');
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('getReview access control', () => {
  const REVIEW_ROW = { id: 9, status: 'completed', repository_owner: 'victim', repository_name: 'private' };

  test('returns 400 for a non-numeric id without querying', async () => {
    const res = mockRes();
    await getReview({ params: { id: '1 OR 1=1' }, user: USER }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(query).not.toHaveBeenCalled();
  });

  test('returns 404 when the review belongs to a repo the user cannot access', async () => {
    query.mockResolvedValueOnce({ rows: [REVIEW_ROW] });
    githubService.canAccessRepository.mockResolvedValue(false);
    const res = mockRes();
    await getReview({ params: { id: '9' }, user: USER }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(query).toHaveBeenCalledTimes(1); // findings never fetched
  });

  test('returns the same 404 when the review does not exist', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = mockRes();
    await getReview({ params: { id: '9' }, user: USER }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Review not found' });
  });

  test('returns the review with findings when the user has access', async () => {
    query.mockResolvedValueOnce({ rows: [REVIEW_ROW] }).mockResolvedValueOnce({ rows: [{ id: 1 }] });
    githubService.canAccessRepository.mockResolvedValue(true);
    const res = mockRes();
    await getReview({ params: { id: '9' }, user: USER }, res, jest.fn());
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ reviewId: 9, findings: [{ id: 1 }] }));
  });
});
