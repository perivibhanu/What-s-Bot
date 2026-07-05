const mongoose = require('mongoose');

const mediaItemSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video'], required: true },
  url: { type: String, required: true },
  caption: { type: String, default: '' }
}, { _id: true });

const collegeMediaSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    unique: true
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  emoji: { type: String, default: '🏫' },
  mediaItems: [mediaItemSchema],
  introVideoUrl: { type: String, default: '' }, // used for root "About College" intro video
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('CollegeMedia', collegeMediaSchema);
