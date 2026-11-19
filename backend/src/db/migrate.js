const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

/**
 * Minimal forward-only migration runner. Applies each src/migrations/*.sql
 * file once, in filename order, recording it in schema_migrations.
 *
 * Postgres' docker-entrypoint-initdb.d only runs on an EMPTY data volume,
 * so schema changes would never reach an existing production database
 * without this. New schema changes go in a new numbered file
 * (002_..., 003_...) - never edit an applied one.
 */
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const MIGRATION_NAME = /^\d{3}_[a-z0-9_]+\.sql$/;

// Arbitrary fixed key: the advisory lock stops two processes booting at
// once (e.g. a rolling deploy) from applying the same migration twice.
const MIGRATION_LOCK_KEY = 72_635_401;

async function runMigrations(pool, { dir = MIGRATIONS_DIR } = {}) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name       TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`
    );

    const appliedResult = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map((r) => r.name));
    const sqlFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'));
    // Strict names only: file-sync tools leave copies like
    // "001_initial_schema 2.sql", which would otherwise run as a migration.
    const files = sqlFiles.filter((f) => MIGRATION_NAME.test(f)).sort();
    for (const ignored of sqlFiles.filter((f) => !MIGRATION_NAME.test(f))) {
      logger.warn({ file: ignored }, 'Ignoring .sql file that is not named NNN_description.sql');
    }

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info({ migration: file }, 'Applied migration');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]).catch(() => {});
    client.release();
  }
}

module.exports = { runMigrations };
