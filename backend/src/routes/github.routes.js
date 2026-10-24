const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { validateRepoParams } = require('../middleware/requireRepoAccess');
const githubController = require('../controllers/github.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/repositories', githubController.getRepositories);
router.get('/repositories/:owner/:repo/pulls', validateRepoParams, githubController.getPullRequests);
router.get('/repositories/:owner/:repo/pulls/:number/files', validateRepoParams, githubController.getPullRequestFiles);

module.exports = router;
