const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  batch: { type: String, required: true },
  branch: { type: String, required: true },
  section: { type: [String], required: true },
  title: { type: String },
  description: { type: String },
  imageUrl: { type: String, required: true },
  cloudinaryId: { type: String, required: true },
  fileType: { type: String, enum: ['image', 'pdf', 'word', 'excel'], default: 'image' },
  fileName: { type: String },
  seatingDetails: [{
    regNumber: { type: String },
    room: { type: String },
    seat: { type: String }
  }],
  isSent: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure unique timetable per class
timetableSchema.index({ batch: 1, branch: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
