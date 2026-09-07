const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Step 1: kick off GitHub OAuth
router.get('/github', passport.authenticate('github'));

// Step 2: GitHub redirects back here with a code; passport exchanges it
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=github_auth_failed` }),
  authController.githubCallback
);

router.post('/logout', authController.logout);
router.get('/me', authController.currentUser);

module.exports = router;
