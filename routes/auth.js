'use strict';
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { createRateLimiter } = require('../middleware/rateLimit');

const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many authentication attempts. Try again later.' });
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
module.exports = router;
