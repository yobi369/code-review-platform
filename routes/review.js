const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review');
const authenticate = require('../middleware/auth');

// Create review route
router.post('/', authenticate, reviewController.createReview);

// Get all reviews route
router.get('/', authenticate, reviewController.getReviews);

module.exports = router;
