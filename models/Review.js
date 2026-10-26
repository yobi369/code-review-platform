'use strict';
const mongoose = require('mongoose');
const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true, trim: true, maxlength: 80 },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now }
}, { _id: false, versionKey: false });
const ReviewSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 10000 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  collaborators: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  comments: { type: [CommentSchema], default: [] },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: false, versionKey: false });
ReviewSchema.index({ owner: 1, createdAt: -1 });
ReviewSchema.index({ collaborators: 1, createdAt: -1 });
module.exports = mongoose.model('Review', ReviewSchema);
