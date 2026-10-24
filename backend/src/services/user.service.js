const { query } = require('../config/db');
const logger = require('../config/logger');
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * Find a user by GitHub id, or create them if this is their first login.
 * Also refreshes cached profile fields + access token on every login,
 * since GitHub is the source of truth for username/avatar.
 *
 * Access token is encrypted before storage using AES-256-GCM via
 * utils/encryption.js - the plaintext token never touches the DB.
 */
async function findOrCreateFromGitHubProfile(profile, accessToken) {
  const githubId = profile.id;
  const username = profile.username;
  const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
  const encryptedToken = encrypt(accessToken);

  const existing = await query('SELECT * FROM users WHERE github_id = $1', [githubId]);

  if (existing.rows.length > 0) {
    const updated = await query(
      `UPDATE users
       SET username = $1, avatar_url = $2, email = $3,
           github_access_token = $4, updated_at = now()
       WHERE github_id = $5
       RETURNING *`,
      [username, avatarUrl, email, encryptedToken, githubId]
    );
    return decryptUser(updated.rows[0]);
  }

  const created = await query(
    `INSERT INTO users (github_id, username, avatar_url, email, github_access_token)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [githubId, username, avatarUrl, email, encryptedToken]
  );
  return decryptUser(created.rows[0]);
}

async function findById(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  if (!result.rows[0]) return null;
  return decryptUser(result.rows[0]);
}

/**
 * Look up by GitHub's numeric account id, not username - usernames can be
 * changed and later claimed by someone else; ids never are.
 */
async function findByGitHubId(githubId) {
  const result = await query('SELECT * FROM users WHERE github_id = $1', [githubId]);
  if (!result.rows[0]) return null;
  return decryptUser(result.rows[0]);
}

/**
 * Decrypt the stored token back to plaintext before returning the user
 * object - callers (passport, github.service, review.service) always
 * get a plaintext token and never need to know about the encryption.
 * Keeps the decrypt/encrypt boundary tight inside this one service.
 *
 * A token that can't be decrypted (TOKEN_ENCRYPTION_KEY rotated, or
 * tampered ciphertext) comes back as null - callers treat that as
 * "log in again" rather than crashing every request for that user.
 * The next login stores a freshly encrypted token.
 */
function decryptUser(user) {
  let token = null;
  try {
    token = decrypt(user.github_access_token);
  } catch (err) {
    logger.warn({ userId: user.id }, 'Stored GitHub token could not be decrypted; user must log in again');
  }
  return { ...user, github_access_token: token };
}

module.exports = { findOrCreateFromGitHubProfile, findById, findByGitHubId };