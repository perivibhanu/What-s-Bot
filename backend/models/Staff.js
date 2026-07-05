const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['teaching', 'lab_assistant'], 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  department: { 
    type: String, 
    required: true 
  },
  contactDetails: { 
    type: String, 
    required: true,
    unique: true
  },
  labName: { 
    type: String,
    required: function() {
      return this.type === 'lab_assistant';
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);
