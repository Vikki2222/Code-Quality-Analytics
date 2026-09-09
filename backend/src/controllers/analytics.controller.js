const analyticsService = require('../services/analytics.service');

async function getDashboard(req, res, next) {
  try {
    const { owner, repo } = req.params;
    const dashboard = await analyticsService.getDashboard(owner, repo);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };