const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { requireRepoAccess } = require('../middleware/requireRepoAccess');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/:owner/:repo/dashboard', requireRepoAccess, analyticsController.getDashboard);
router.get('/:owner/:repo/issues', requireRepoAccess, analyticsController.listIssues);
router.get('/:owner/:repo/issues/:id', requireRepoAccess, analyticsController.getIssue);
router.get('/:owner/:repo/file', requireRepoAccess, analyticsController.getFile);
router.get('/:owner/:repo/pull-reviews', requireRepoAccess, analyticsController.getPullReviews);

module.exports = router;
