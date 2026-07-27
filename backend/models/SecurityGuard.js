const mongoose = require('mongoose');

const securityGuardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  gateAssigned: {
    type: String,
    required: true,
    default: 'Gate 1 (Hostel Gate)'
  },
  shift: {
    type: String,
    required: true,
    default: 'Day Shift'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SecurityGuard', securityGuardSchema);
