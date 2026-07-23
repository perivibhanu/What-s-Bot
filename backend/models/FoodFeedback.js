const mongoose = require('mongoose');

const foodFeedbackSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: Date, default: Date.now },
  breakfastRating: { type: Number, min: 1, max: 10 },
  lunchRating: { type: Number, min: 1, max: 10 },
  snacksRating: { type: Number, min: 1, max: 10 },
  dinnerRating: { type: Number, min: 1, max: 10 }
}, { timestamps: true });

// Prevent multiple feedback submissions per student per day
// foodFeedbackSchema.index({ studentId: 1, date: 1 }, { unique: true }); // We won't enforce unique constraint on date blindly since it has a time component, but we can query it

// Automatically delete documents 7 days (604800 seconds) after the date
foodFeedbackSchema.index({ date: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('FoodFeedback', foodFeedbackSchema);
