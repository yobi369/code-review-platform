const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review');
const authenticate = require('../middleware/auth');

// Create review route
router.post('/', authenticate, reviewController.createReview);

router.post('/analyze', authenticate, async (req, res) => {
    const { code } = req.body;
    try {
        const analysisResult = await analyzeCode(code);
        res.json(analysisResult);
    } catch (error) {
        res.status(500).json({ error: "Error analyzing code" });
    }
});

// Get all reviews route
router.get('/', authenticate, reviewController.getReviews);

module.exports = router;
