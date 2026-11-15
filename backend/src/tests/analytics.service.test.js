jest.mock('../config/db', () => ({ query: jest.fn() }));

const { query } = require('../config/db');
const analyticsService = require('../services/analytics.service');

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
});

describe('listIssues', () => {
  test('adds status and category as parameters, never interpolated', async () => {
    await analyticsService.listIssues('o', 'r', { status: 'recurring', category: 'security' });
    const [sql, params] = query.mock.calls[0];
    expect(params).toEqual(['o', 'r', 'recurring', 'security']);
    expect(sql).toContain('fp.status = $3');
    expect(sql).toContain('fp.category = $4');
    expect(sql).not.toContain('recurring');
  });

  test('never selects the embedding vector', async () => {
    await analyticsService.listIssues('o', 'r');
    expect(query.mock.calls[0][0]).not.toMatch(/embedding/);
  });
});

describe('getIssue', () => {
  test('returns null when the issue is not in this repo (no occurrence query)', async () => {
    expect(await analyticsService.getIssue('o', 'r', '5')).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual(['5', 'o', 'r']);
  });

  test('returns the issue with its occurrences', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 5, status: 'recurring' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, pr_number: 3 }, { id: 2, pr_number: 9 }] });
    const issue = await analyticsService.getIssue('o', 'r', '5');
    expect(issue.status).toBe('recurring');
    expect(issue.occurrences.map((o) => o.pr_number)).toEqual([3, 9]);
  });
});

describe('getDashboard weekDelta', () => {
  function mockDashboardQueries({ weekAgo }) {
    query.mockImplementation(async (sql) => {
      if (sql.includes("interval '7 days'")) return { rows: weekAgo === null ? [] : [{ score: weekAgo }] };
      if (sql.includes('COUNT(*) FILTER')) return { rows: [{ open_count: '1', resolved_count: '0', recurring_count: '0' }] };
      if (sql.includes("fp.status IN ('open', 'recurring')")) return { rows: [{ status: 'open', latest_severity: 'high' }] };
      return { rows: [] };
    });
  }

  test('is the score change versus the snapshot from a week ago', async () => {
    mockDashboardQueries({ weekAgo: 100 });
    const { health } = await analyticsService.getDashboard('o', 'r');
    expect(health.score).toBe(92); // 100 - high(8)
    expect(health.weekDelta).toBe(-8);
  });

  test('is null when there is no week-old history', async () => {
    mockDashboardQueries({ weekAgo: null });
    const { health } = await analyticsService.getDashboard('o', 'r');
    expect(health.weekDelta).toBeNull();
  });
});
