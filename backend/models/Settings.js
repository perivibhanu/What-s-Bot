const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  welcomeMessage: { type: String, default: 'Welcome to VCET! How can we help you today?' },
  aboutMessage: { type: String, default: 'VCET is a premier engineering college...' },
  aboutUrl: { type: String, default: 'https://vcet.ac.in' },
  contactNumber: { type: String, default: '+919876543210' },
  headerImageUrl: { type: String, default: 'https://vcet.ac.in/vcetit/images/About%20Us/College1.jpg' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
