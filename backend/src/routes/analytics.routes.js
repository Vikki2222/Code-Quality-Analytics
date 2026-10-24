const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { requireRepoAccess } = require('../middleware/requireRepoAccess');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/:owner/:repo/dashboard', requireRepoAccess, analyticsController.getDashboard);

module.exports = router;