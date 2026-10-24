jest.mock('../config/db', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../services/github.service', () => ({
  getPullRequest: jest.fn(),
  getPullRequestFiles: jest.fn(),
}));

jest.mock('../services/ai.service', () => ({
  analyzeDiff: jest.fn(),
}));

jest.mock('../services/fingerprint.service', () => ({
  fingerprintFinding: jest.fn(),
  markResolvedFindings: jest.fn(),
}));

const { query, withTransaction } = require('../config/db');
const githubService = require('../services/github.service');
const aiService = require('../services/ai.service');
const { fingerprintFinding, markResolvedFindings } = require('../services/fingerprint.service');
const reviewService = require('../services/review.service');

const MOCK_PR = {
  githubId: 123,
  number: 1,
  title: 'Test PR',
  state: 'open',
  author: 'Vikki2222',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  mergedAt: null,
};

const MOCK_FILES = [
  {
    filename: 'src/auth.js',
    status: 'modified',
    additions: 10,
    deletions: 2,
    changes: 12,
    patch: '@@ -1,5 +1,5 @@\n+// some change\n function auth() {}',
    previousFilename: null,
  },
];

const MOCK_FINDINGS = [
  {
    category: 'security',
    severity: 'high',
    file: 'src/auth.js',
    line: 3,
    title: 'Missing input validation',
    description: 'User input is not validated before use.',
    recommendation: 'Add validation before processing input.',
  },
];

beforeEach(() => {
  jest.clearAllMocks();

  githubService.getPullRequest.mockResolvedValue(MOCK_PR);
  githubService.getPullRequestFiles.mockResolvedValue(MOCK_FILES);
  aiService.analyzeDiff.mockResolvedValue({ findings: MOCK_FINDINGS, model: 'gemini-3.6-flash' });
  fingerprintFinding.mockResolvedValue(42);
  markResolvedFindings.mockResolvedValue([]);
  // Run the transaction body against the same query mock so SQL assertions still apply.
  withTransaction.mockImplementation((fn) => fn({ query }));

  query.mockImplementation((sql) => {
    if (sql.includes('INSERT INTO pull_requests')) return { rows: [{ id: 1 }] };
    if (sql.includes('INSERT INTO reviews')) return { rows: [{ id: 1 }] };
    if (sql.includes('INSERT INTO findings')) return { rows: [] };
    if (sql.includes('UPDATE reviews')) return { rows: [] };
    if (sql.includes('SELECT pull_request_id')) return { rows: [{ pull_request_id: 1 }] };
    return { rows: [] };
  });
});

describe('processQueuedReview', () => {
  const args = {
    reviewId: 1,
    userId: 1,
    accessToken: 'token',
    owner: 'Vikki2222',
    repo: 'workshop',
    pullNumber: 1,
  };

  test('fetches PR files from GitHub', async () => {
    await reviewService.processQueuedReview(args);
    expect(githubService.getPullRequestFiles).toHaveBeenCalledWith('token', 'Vikki2222', 'workshop', 1);
  });

  test('sends filtered files to AI service', async () => {
    await reviewService.processQueuedReview(args);
    expect(aiService.analyzeDiff).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ filename: 'src/auth.js' })])
    );
  });

  test('fingerprints each finding', async () => {
    await reviewService.processQueuedReview(args);
    expect(fingerprintFinding).toHaveBeenCalledTimes(MOCK_FINDINGS.length);
    expect(fingerprintFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'Vikki2222',
        repo: 'workshop',
        filePath: 'src/auth.js',
        category: 'security',
      }),
      expect.anything()
    );
  });

  test('inserts findings into DB with fingerprint_id', async () => {
    await reviewService.processQueuedReview(args);
    const findingInsert = query.mock.calls.find((call) => call[0].includes('INSERT INTO findings'));
    expect(findingInsert).toBeDefined();
    expect(findingInsert[1]).toContain(42);
  });

  test('marks review as completed in DB', async () => {
    await reviewService.processQueuedReview(args);
    const updateCall = query.mock.calls.find(
      (call) => call[0].includes('UPDATE reviews') && call[0].includes('completed')
    );
    expect(updateCall).toBeDefined();
  });

  test('calls markResolvedFindings after inserting findings', async () => {
    await reviewService.processQueuedReview(args);
    expect(markResolvedFindings).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'Vikki2222',
        repo: 'workshop',
        analyzedFilePaths: expect.arrayContaining(['src/auth.js']),
        detectedFingerprintIds: expect.arrayContaining([42]),
      }),
      expect.anything()
    );
  });

  test('marks review as failed when AI service throws', async () => {
    aiService.analyzeDiff.mockRejectedValue(new Error('Gemini rate limited'));
    await expect(reviewService.processQueuedReview(args)).rejects.toThrow('Gemini rate limited');
    const failCall = query.mock.calls.find(
      (call) => call[0].includes('UPDATE reviews') && call[0].includes('failed')
    );
    expect(failCall).toBeDefined();
  });

  test('handles empty filesToAnalyze gracefully', async () => {
    githubService.getPullRequestFiles.mockResolvedValue([
      {
        filename: 'package-lock.json',
        status: 'modified',
        additions: 100,
        deletions: 100,
        changes: 200,
        patch: 'x',
      },
    ]);
    await reviewService.processQueuedReview(args);
    expect(aiService.analyzeDiff).not.toHaveBeenCalled();
    const completeCall = query.mock.calls.find(
      (call) => call[0].includes('UPDATE reviews') && call[0].includes('completed')
    );
    expect(completeCall).toBeDefined();
  });
  test('does not mark review failed on a non-final attempt (BullMQ will retry)', async () => {
    aiService.analyzeDiff.mockRejectedValue(new Error('AI timeout'));
    await expect(reviewService.processQueuedReview({ ...args, isFinalAttempt: false })).rejects.toThrow('AI timeout');
    const failCall = query.mock.calls.find(
      (call) => call[0].includes('UPDATE reviews') && call[0].includes('failed')
    );
    expect(failCall).toBeUndefined();
  });

  test('writes findings, resolution and completion inside one transaction', async () => {
    const txQuery = jest.fn(() => ({ rows: [] }));
    withTransaction.mockImplementation((fn) => fn({ query: txQuery }));
    await reviewService.processQueuedReview(args);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(txQuery.mock.calls.some((c) => c[0].includes('INSERT INTO findings'))).toBe(true);
    expect(txQuery.mock.calls.some((c) => c[0].includes('UPDATE reviews') && c[0].includes('completed'))).toBe(true);
    expect(fingerprintFinding).toHaveBeenCalledWith(expect.any(Object), { query: txQuery });
    // Nothing written for findings outside the transaction
    expect(query.mock.calls.some((c) => c[0].includes('INSERT INTO findings'))).toBe(false);
  });

  test('marks failed and does not complete when the transaction fails on the final attempt', async () => {
    withTransaction.mockRejectedValue(new Error('embedding failed'));
    await expect(reviewService.processQueuedReview(args)).rejects.toThrow('embedding failed');
    expect(query.mock.calls.some((c) => c[0].includes('UPDATE reviews') && c[0].includes('failed'))).toBe(true);
  });
});
