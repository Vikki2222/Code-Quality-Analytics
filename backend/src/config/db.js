const { Pool } = require('pg');
const logger = require('./logger');

// Single shared pool for the whole app. Services/controllers should
// import { query } from here rather than creating their own clients.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  // Idle client errors (e.g. DB restarts) should not crash the process.
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
});

/**
 * Run a parameterized query.
 * Always use $1, $2... placeholders - never string-concatenate user input.
 */
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
