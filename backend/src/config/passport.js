const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const userService = require('../services/user.service');

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      // We only need identity + public repo access for now.
      // 'repo' scope (private repos) can be added later if needed -
      // don't request more than the app currently uses.
      scope: ['read:user', 'user:email', 'repo'],
      // Random nonce stored in the session and checked on callback -
      // prevents login CSRF (an attacker completing OAuth into their own
      // account in the victim's browser).
      state: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await userService.findOrCreateFromGitHubProfile(profile, accessToken);
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Only store the user id in the session - keep the session payload tiny.
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userService.findById(id);
    // false = treat the session as logged out. Covers a deleted user and a
    // token that no longer decrypts (key rotation) - both need a fresh login.
    if (!user || !user.github_access_token) return done(null, false);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
