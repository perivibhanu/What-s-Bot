const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
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
  busNumber: {
    type: String,
    required: true,
    trim: true
  },
  routeNumber: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Driver', driverSchema);
