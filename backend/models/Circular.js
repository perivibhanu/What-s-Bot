const mongoose = require('mongoose');

const circularSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, enum: ['document', 'image'], default: 'document' },
  type: { type: String, enum: ['principal', 'hod'], default: 'principal' },
  department: { type: String }, // For HOD circulars
  sentBy: { type: String, default: 'Principal' },
  sentAt: { type: Date, default: Date.now },
  recipientCount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'sent'], default: 'draft' },
  targetAudience: { type: String, enum: ['students', 'parents', 'both', 'teaching', 'lab_assistant', 'all'], default: 'all' },
  targetBatch: { type: String },
  targetDepartment: { type: [String], default: [] },
  targetSection: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Circular', circularSchema);
