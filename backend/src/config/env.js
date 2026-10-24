// Fail fast at boot with a clear message, instead of a cryptic crash on
// the first request that happens to need a missing value.

// Both processes load ai.service (the OpenAI SDK throws on a missing key
// at construction) and user.service (encryption key read at import).
const SHARED_ENV = ['DATABASE_URL', 'REDIS_URL', 'TOKEN_ENCRYPTION_KEY', 'OPENROUTER_API_KEY', 'GEMINI_API_KEY'];

const API_ENV = [
  ...SHARED_ENV,
  'SESSION_SECRET',
  'FRONTEND_URL',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_CALLBACK_URL',
  'GITHUB_WEBHOOK_SECRET',
];

const WORKER_ENV = SHARED_ENV;

function validateEnv(required, env = process.env) {
  const problems = required.filter((name) => !env[name]).map((name) => `${name} is not set`);

  if (env.TOKEN_ENCRYPTION_KEY && !/^[0-9a-fA-F]{64}$/.test(env.TOKEN_ENCRYPTION_KEY)) {
    problems.push('TOKEN_ENCRYPTION_KEY must be 64 hex characters (generate with: openssl rand -hex 32)');
  }
  if (required.includes('SESSION_SECRET') && env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
    problems.push('SESSION_SECRET must be at least 32 characters');
  }

  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${problems.join('\n  - ')}`);
  }
}

module.exports = { validateEnv, API_ENV, WORKER_ENV };
