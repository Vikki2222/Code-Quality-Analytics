const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { requireRepoAccess } = require('../middleware/requireRepoAccess');
const reviewController = require('../controllers/review.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', reviewController.createReview);
router.get('/history/:owner/:repo', requireRepoAccess, reviewController.getRepoHistory);
router.get('/:id', reviewController.getReview);

module.exports = router;