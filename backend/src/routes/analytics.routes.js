const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/:owner/:repo/dashboard', analyticsController.getDashboard);

module.exports = router;