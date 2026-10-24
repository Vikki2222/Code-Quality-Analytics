const { validateEnv, API_ENV, WORKER_ENV } = require('../config/env');

const VALID = {
  DATABASE_URL: 'postgresql://x',
  REDIS_URL: 'redis://x',
  TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
  OPENROUTER_API_KEY: 'k',
  GEMINI_API_KEY: 'k',
  SESSION_SECRET: 's'.repeat(32),
  FRONTEND_URL: 'http://localhost',
  GITHUB_CLIENT_ID: 'id',
  GITHUB_CLIENT_SECRET: 'secret',
  GITHUB_CALLBACK_URL: 'http://localhost/api/auth/github/callback',
  GITHUB_WEBHOOK_SECRET: 'w',
};

describe('validateEnv', () => {
  test('passes with a complete API environment', () => {
    expect(() => validateEnv(API_ENV, VALID)).not.toThrow();
  });

  test('lists every missing variable in one error', () => {
    const env = { ...VALID };
    delete env.SESSION_SECRET;
    delete env.GITHUB_WEBHOOK_SECRET;
    expect(() => validateEnv(API_ENV, env)).toThrow(/SESSION_SECRET is not set[\s\S]*GITHUB_WEBHOOK_SECRET is not set/);
  });

  test('rejects a malformed encryption key', () => {
    expect(() => validateEnv(API_ENV, { ...VALID, TOKEN_ENCRYPTION_KEY: 'not-hex' })).toThrow(/64 hex characters/);
  });

  test('rejects a short session secret', () => {
    expect(() => validateEnv(API_ENV, { ...VALID, SESSION_SECRET: 'short' })).toThrow(/at least 32/);
  });

  test('worker does not require API-only variables', () => {
    const env = { ...VALID };
    delete env.SESSION_SECRET;
    delete env.GITHUB_CLIENT_SECRET;
    expect(() => validateEnv(WORKER_ENV, env)).not.toThrow();
  });
});
