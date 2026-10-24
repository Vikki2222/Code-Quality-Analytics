jest.mock('../services/github.service', () => ({ canAccessRepository: jest.fn() }));

const githubService = require('../services/github.service');
const { requireRepoAccess, validateRepoParams, accessCache } = require('../middleware/requireRepoAccess');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function run(params, user = { id: 1, github_access_token: 'tok' }) {
  const req = { params, user };
  const res = mockRes();
  const next = jest.fn();
  return requireRepoAccess(req, res, next).then(() => ({ res, next }));
}

beforeEach(() => {
  jest.clearAllMocks();
  accessCache.clear();
});

describe('requireRepoAccess', () => {
  test('allows a repo the user can access on GitHub', async () => {
    githubService.canAccessRepository.mockResolvedValue(true);
    const { next, res } = await run({ owner: 'octo', repo: 'repo' });
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(githubService.canAccessRepository).toHaveBeenCalledWith('tok', 'octo', 'repo');
  });

  test('returns 404 for a repo the user cannot access', async () => {
    githubService.canAccessRepository.mockResolvedValue(false);
    const { next, res } = await run({ owner: 'someone', repo: 'private' });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('caches a positive result per user', async () => {
    githubService.canAccessRepository.mockResolvedValue(true);
    await run({ owner: 'octo', repo: 'repo' });
    await run({ owner: 'octo', repo: 'repo' });
    expect(githubService.canAccessRepository).toHaveBeenCalledTimes(1);
  });

  test('does not share cached access between users', async () => {
    githubService.canAccessRepository.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await run({ owner: 'octo', repo: 'repo' }, { id: 1, github_access_token: 'a' });
    const { res } = await run({ owner: 'octo', repo: 'repo' }, { id: 2, github_access_token: 'b' });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('does not cache a negative result', async () => {
    githubService.canAccessRepository.mockResolvedValue(false);
    await run({ owner: 'octo', repo: 'repo' });
    await run({ owner: 'octo', repo: 'repo' });
    expect(githubService.canAccessRepository).toHaveBeenCalledTimes(2);
  });

  test.each([['..'], ['a/../b'], ['bad name'], ['']])('rejects invalid owner %p with 400', async (owner) => {
    const { res, next } = await run({ owner, repo: 'repo' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
    expect(githubService.canAccessRepository).not.toHaveBeenCalled();
  });

  test('returns 401 when the GitHub token is revoked', async () => {
    githubService.canAccessRepository.mockRejectedValue({ response: { status: 401 } });
    const { res } = await run({ owner: 'octo', repo: 'repo' });
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('passes other errors to next', async () => {
    const err = new Error('network');
    githubService.canAccessRepository.mockRejectedValue(err);
    const { next } = await run({ owner: 'octo', repo: 'repo' });
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('validateRepoParams', () => {
  function check(params) {
    const res = mockRes();
    const next = jest.fn();
    validateRepoParams({ params }, res, next);
    return { res, next };
  }

  test('accepts valid owner/repo/number', () => {
    expect(check({ owner: 'my-org', repo: 'repo.js_2', number: '42' }).next).toHaveBeenCalled();
  });

  test.each([['0'], ['-1'], ['1e3'], ['abc'], ['12345678901']])('rejects PR number %p', (number) => {
    expect(check({ owner: 'o', repo: 'r', number }).res.status).toHaveBeenCalledWith(400);
  });

  test('rejects a traversal repo name', () => {
    expect(check({ owner: 'o', repo: '..' }).res.status).toHaveBeenCalledWith(400);
  });
});
