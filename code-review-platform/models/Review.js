const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Review', reviewSchema);
