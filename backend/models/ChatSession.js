const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  currentState: { type: String, default: 'initial' },
  tempRegNumber: { type: String },
  currentTopic: { type: String },
  issueCategory: { type: String },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  wardenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warden' },
  userType: { type: String, enum: ['visitor', 'student', 'staff', 'parent', 'warden'], default: 'visitor' },
  lastInteraction: { type: Date, default: Date.now },
  admissionStep: { type: String, default: '' },
  admissionData: { type: mongoose.Schema.Types.Mixed, default: {} },
  tempFeedback: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
