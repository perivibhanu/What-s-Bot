const mongoose = require('mongoose');

const placementMaterialSchema = new mongoose.Schema({
  batch: { type: String, required: true },
  branch: { type: String, required: true },
  section: { type: [String], required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  cloudinaryId: { type: String },
  fileType: { type: String, required: true }, // pdf, excel, word, image
  uploadedAt: { type: Date, default: Date.now },
  isSent: { type: Boolean, default: false },
  sentAt: { type: Date },
  recipientCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('PlacementMaterial', placementMaterialSchema);
