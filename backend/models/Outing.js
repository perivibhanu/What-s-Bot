const mongoose = require('mongoose');

const outingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  wardenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warden',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Out', 'Rejected', 'Returned'],
    default: 'Pending'
  },
  requestTime: {
    type: Date,
    default: Date.now
  },
  expectedReturnTime: {
    type: Date
  },
  actualReturnTime: {
    type: Date
  },
  returnOTP: {
    type: String
  },
  otpExpiry: {
    type: Date
  }
});

module.exports = mongoose.model('Outing', outingSchema);
