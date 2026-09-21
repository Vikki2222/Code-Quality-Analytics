const { query } = require('../config/db');
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

async function findByGitHubUsername(username) {
  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  if (!result.rows[0]) return null;
  return decryptUser(result.rows[0]);
}

/**
 * Decrypt the stored token back to plaintext before returning the user
 * object - callers (passport, github.service, review.service) always
 * get a plaintext token and never need to know about the encryption.
 * Keeps the decrypt/encrypt boundary tight inside this one service.
 */
function decryptUser(user) {
  return {
    ...user,
    github_access_token: decrypt(user.github_access_token),
  };
}

module.exports = { findOrCreateFromGitHubProfile, findById, findByGitHubUsername };