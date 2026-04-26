const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getRecommendations } = require('../controllers/recommendationsController');

router.post('/', requireAuth, getRecommendations);

module.exports = router;
