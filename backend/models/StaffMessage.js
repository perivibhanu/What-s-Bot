const mongoose = require('mongoose');

const staffMessageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetAudience: { type: String, enum: ['teaching', 'lab_assistant', 'all'] }, // populated on send
  targetDepartment: { type: String }, // optional, if sending to specific dept
  sentBy: { type: String, default: 'Principal' },
  recipientCount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'sent'], default: 'draft' },
  fileUrl: { type: String },
  fileName: { type: String },
  fileType: { type: String, enum: ['document', 'image'] },
  cloudinaryPublicId: { type: String },
  sentAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('StaffMessage', staffMessageSchema);
