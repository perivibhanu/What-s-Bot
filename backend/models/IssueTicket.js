const mongoose = require('mongoose');

const issueTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  category: {
    type: String,
    enum: ['Hostel', 'Bus', 'College'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Open', 'Under Review', 'Resolved'],
    default: 'Open'
  },
  adminMessage: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('IssueTicket', issueTicketSchema);
