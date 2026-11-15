jest.mock('../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
jest.mock('../services/trackedRepo.service', () => ({
  listTrackedRepos: jest.fn(),
  trackRepo: jest.fn(),
  untrackRepo: jest.fn(),
}));
jest.mock('../services/analytics.service', () => ({ getRepoSummary: jest.fn() }));
jest.mock('../services/github.service', () => ({ canAccessRepository: jest.fn() }));

const trackedRepoService = require('../services/trackedRepo.service');
const analyticsService = require('../services/analytics.service');
const githubService = require('../services/github.service');
const { accessCache } = require('../middleware/requireRepoAccess');
const { listTracked, track } = require('../controllers/repos.controller');

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
});

describe('track', () => {
  test('rejects invalid names without calling GitHub', async () => {
    const res = mockRes();
    await track({ body: { owner: '..', repo: 'r' }, user: USER }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(githubService.canAccessRepository).not.toHaveBeenCalled();
  });

  test('refuses to track a repo the user cannot see', async () => {
    githubService.canAccessRepository.mockResolvedValue(false);
    const res = mockRes();
    await track({ body: { owner: 'o', repo: 'private' }, user: USER }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(trackedRepoService.trackRepo).not.toHaveBeenCalled();
  });

  test('tracks an accessible repo', async () => {
    githubService.canAccessRepository.mockResolvedValue(true);
    const res = mockRes();
    await track({ body: { owner: 'o', repo: 'r' }, user: USER }, res, jest.fn());
    expect(trackedRepoService.trackRepo).toHaveBeenCalledWith(1, 'o', 'r');
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('listTracked', () => {
  test('returns summaries, but no data for repos the user lost access to', async () => {
    trackedRepoService.listTrackedRepos.mockResolvedValue([
      { owner: 'o', name: 'mine', created_at: 't1' },
      { owner: 'o', name: 'gone', created_at: 't2' },
    ]);
    githubService.canAccessRepository.mockImplementation(async (_tok, _o, repo) => repo === 'mine');
    analyticsService.getRepoSummary.mockResolvedValue({ health: { score: 90 }, reviewCount: 3 });

    const res = mockRes();
    await listTracked({ user: USER }, res, jest.fn());
    const { repos } = res.json.mock.calls[0][0];
    expect(repos[0]).toEqual(expect.objectContaining({ name: 'mine', accessLost: false, reviewCount: 3 }));
    expect(repos[1]).toEqual({ owner: 'o', name: 'gone', trackedAt: 't2', accessLost: true });
    expect(analyticsService.getRepoSummary).toHaveBeenCalledTimes(1);
  });
});
