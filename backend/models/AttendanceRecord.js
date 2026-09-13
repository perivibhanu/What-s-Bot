const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  department: { type: String, required: true },
  year: { type: String, required: true },
  section: { type: String, required: true },
  absentees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  leave: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  recordedBy: { type: String, required: true } // phone number or name of staff
}, { timestamps: true });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
