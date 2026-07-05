const mongoose = require('mongoose');

const transportPlanSchema = new mongoose.Schema({
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  cloudinaryId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('TransportPlan', transportPlanSchema);
