const express = require('express');
const { subscribe } = require('../controllers/notifications.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(requireAuth);

// POST /api/notifications/subscribe
router.post('/subscribe', subscribe);

module.exports = router;
