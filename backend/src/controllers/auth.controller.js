// Called after passport has already authenticated the GitHub callback.
function githubCallback(req, res) {
  // req.user is populated by passport's deserializeUser via the session.
  res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
}

function logout(req, res, next) {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out' });
    });
  });
}

function currentUser(req, res) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { id, username, avatar_url, email } = req.user;
  res.json({ id, username, avatarUrl: avatar_url, email });
}

module.exports = { githubCallback, logout, currentUser };
