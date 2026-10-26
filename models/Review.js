'use strict';
const mongoose = require('mongoose');
const ReviewSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 10000 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: false, versionKey: false });
ReviewSchema.index({ owner: 1, createdAt: -1 });
module.exports = mongoose.model('Review', ReviewSchema);
