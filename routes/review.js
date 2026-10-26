'use strict';
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review');
const authenticate = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { analyzeCode } = require('../services/ai');

const analysisLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 5, message: 'AI analysis rate limit reached. Try again later.' });
router.post('/', authenticate, reviewController.createReview);
router.post('/:id/collaborators', authenticate, createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, message: 'Collaborator invite limit reached.' }), reviewController.addCollaborator);
router.post('/analyze', authenticate, analysisLimiter, async (req, res) => {
  try {
    const result = await analyzeCode(req.body && req.body.code);
    return res.json(result);
  } catch (error) {
    const status = Number.isInteger(error.statusCode) ? error.statusCode : 502;
    if (status >= 500) console.error('Code analysis failed:', error.message);
    return res.status(status).json({ error: status === 502 ? 'AI analysis provider failed or timed out' : error.message });
  }
});
router.get('/', authenticate, reviewController.getReviews);
module.exports = router;
