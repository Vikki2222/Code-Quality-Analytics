jest.mock('../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

const { runMigrations } = require('../db/migrate');

// Fake pg pool: records SQL, reports `alreadyApplied` from schema_migrations,
// and optionally fails when a migration body runs.
function fakePool({ alreadyApplied = [], failOnMigration = false } = {}) {
  const calls = [];
  const client = {
    query: jest.fn(async (sql) => {
      calls.push(sql);
      if (sql.startsWith('SELECT name FROM schema_migrations')) {
        return { rows: alreadyApplied.map((name) => ({ name })) };
      }
      if (failOnMigration && sql.includes('CREATE TABLE IF NOT EXISTS users')) {
        throw new Error('syntax error');
      }
      return { rows: [] };
    }),
    release: jest.fn(),
  };
  return { pool: { connect: jest.fn(async () => client) }, client, calls };
}

describe('runMigrations', () => {
  test('applies pending migrations in a transaction and records them', async () => {
    const { pool, calls } = fakePool();
    await runMigrations(pool);
    const begin = calls.indexOf('BEGIN');
    const body = calls.findIndex((sql) => sql.includes('CREATE TABLE IF NOT EXISTS users'));
    const record = calls.findIndex((sql) => sql.startsWith('INSERT INTO schema_migrations'));
    const commit = calls.indexOf('COMMIT');
    expect(begin).toBeGreaterThan(-1);
    expect(begin).toBeLessThan(body);
    expect(body).toBeLessThan(record);
    expect(record).toBeLessThan(commit);
  });

  test('skips migrations that are already recorded', async () => {
    const { pool, calls } = fakePool({ alreadyApplied: ['001_initial_schema.sql'] });
    await runMigrations(pool);
    expect(calls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS users'))).toBe(false);
  });

  test('rolls back, names the file, and still releases lock + client on failure', async () => {
    const { pool, client, calls } = fakePool({ failOnMigration: true });
    await expect(runMigrations(pool)).rejects.toThrow('Migration 001_initial_schema.sql failed: syntax error');
    expect(calls).toContain('ROLLBACK');
    expect(calls).not.toContain('COMMIT');
    expect(calls.some((sql) => sql.includes('pg_advisory_unlock'))).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });

  test('takes the advisory lock before reading applied migrations', async () => {
    const { pool, calls } = fakePool();
    await runMigrations(pool);
    const lock = calls.findIndex((sql) => sql.includes('pg_advisory_lock'));
    const read = calls.findIndex((sql) => sql.startsWith('SELECT name FROM schema_migrations'));
    expect(lock).toBeGreaterThan(-1);
    expect(lock).toBeLessThan(read);
  });
});
