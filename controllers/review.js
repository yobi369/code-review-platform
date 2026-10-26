'use strict';
const Review = require('../models/Review');
exports.createReview = async (req, res) => {
  const body = req.body || {};
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!title || title.length > 160) return res.status(400).json({ error: 'Title is required and must be at most 160 characters' });
  if (!description || description.length > 10000) return res.status(400).json({ error: 'Description is required and must be at most 10000 characters' });
  try {
    const review = await Review.create({ title, description, owner: req.userId });
    return res.status(201).json({ message: 'Review session created successfully', review });
  } catch (error) {
    console.error('Review creation failed:', error && error.message);
    return res.status(500).json({ error: 'Could not create review session' });
  }
};
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ owner: req.userId }).sort({ createdAt: -1 }).limit(100).lean();
    return res.status(200).json(reviews);
  } catch (error) {
    console.error('Review listing failed:', error && error.message);
    return res.status(500).json({ error: 'Could not fetch review sessions' });
  }
};
