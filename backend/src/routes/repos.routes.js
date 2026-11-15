const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { validateRepoParams } = require('../middleware/requireRepoAccess');
const reposController = require('../controllers/repos.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', reposController.listTracked);
router.post('/', reposController.track);
router.delete('/:owner/:repo', validateRepoParams, reposController.untrack);

module.exports = router;
