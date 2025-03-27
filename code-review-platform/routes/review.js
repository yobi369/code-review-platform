const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { ensureAuth } = require('../middleware/auth');
const { analyzeCode } = require('../services/ai');

// Get all reviews for the dashboard
router.get('/dashboard', ensureAuth, async (req, res) => {
  const reviews = await Review.find({ createdBy: req.user.id }).lean();
  res.render('dashboard', { user: req.user, reviews });
});

// Get a specific review by roomId
router.get('/:roomId', ensureAuth, async (req, res) => {
  const review = await Review.findOne({ roomId: req.params.roomId })
    .populate('comments.user')
    .lean();
  if (!review) return res.status(404).send('Review not found');
  const aiSuggestions = await analyzeCode(review.code);
  res.render('review', { review, aiSuggestions, user: req.user });
});

// Create a new review
router.post('/create', ensureAuth, async (req, res) => {
  const { code } = req.body;
  const roomId = Math.random().toString(36).substring(2, 10);
  const review = new Review({ roomId, code, createdBy: req.user.id });
  await review.save();
  res.redirect(`/review/${roomId}`);
});

module.exports = router;
