'use strict';
const mongoose = require('mongoose');
const Review = require('../models/Review');
const User = require('../models/User');
const webSocketService = require('../services/websocket');
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
    const reviews = await Review.find({ $or: [{ owner: req.userId }, { collaborators: req.userId }] }).sort({ createdAt: -1 }).limit(100).lean();
    return res.status(200).json(reviews);
  } catch (error) {
    console.error('Review listing failed:', error && error.message);
    return res.status(500).json({ error: 'Could not fetch review sessions' });
  }
};

exports.addCollaborator = async (req, res) => {
  const reviewId = req.params.id;
  const username = req.body && typeof req.body.username === 'string' ? req.body.username.trim() : '';
  if (!mongoose.isValidObjectId(reviewId)) return res.status(400).json({ error: 'Invalid review id' });
  if (username.length < 3 || username.length > 80) return res.status(400).json({ error: 'Enter a valid collaborator username' });
  try {
    const collaborator = await User.findOne({ username }).select('_id username').lean();
    if (!collaborator) return res.status(404).json({ error: 'No account exists with that username' });
    if (String(collaborator._id) === String(req.userId)) return res.status(400).json({ error: 'You already own this review' });
    const review = await Review.findOneAndUpdate(
      { _id: reviewId, owner: req.userId },
      { $addToSet: { collaborators: collaborator._id } },
      { new: true, projection: { _id: 1 } }
    );
    if (!review) return res.status(404).json({ error: 'Review not found or you are not its owner' });
    return res.status(200).json({ message: 'Collaborator added', username: collaborator.username });
  } catch (error) {
    console.error('Adding collaborator failed:', error && error.message);
    return res.status(500).json({ error: 'Could not add collaborator' });
  }
};

exports.removeCollaborator = async (req, res) => {
  const reviewId = req.params.id;
  const username = typeof req.params.username === 'string' ? req.params.username.trim() : '';
  if (!mongoose.isValidObjectId(reviewId)) return res.status(400).json({ error: 'Invalid review id' });
  try {
    const collaborator = await User.findOne({ username }).select('_id').lean();
    if (!collaborator) return res.status(404).json({ error: 'Collaborator account not found' });
    const result = await Review.updateOne(
      { _id: reviewId, owner: req.userId },
      { $pull: { collaborators: collaborator._id } }
    );
    if (!result.matchedCount) return res.status(404).json({ error: 'Review not found or you are not its owner' });
    webSocketService.revokeUserAccess(reviewId, collaborator._id);
    return res.status(200).json({ message: 'Collaborator access revoked' });
  } catch (error) {
    console.error('Removing collaborator failed:', error && error.message);
    return res.status(500).json({ error: 'Could not remove collaborator' });
  }
};
