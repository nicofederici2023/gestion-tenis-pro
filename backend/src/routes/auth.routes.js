const express = require('express');
const { signup, login, logout, getMe } = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);

module.exports = router;
