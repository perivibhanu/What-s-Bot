const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  regNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  branch: { type: String, required: true },
  section: { type: String, required: true },
  phoneNumber: { type: String },
  parentPhoneNumber: { type: String },
  isRegistered: { type: Boolean, default: false },
  scholarType: { type: String, enum: ['Hostel', 'Days Scholar', 'Private'], default: 'Days Scholar' },
  marks: {
    mid1: { type: Map, of: Number, default: {} },
    mid2: { type: Map, of: Number, default: {} },
    model: { type: Map, of: Number, default: {} },
    sem1: { type: Number, default: 0 },
    sem2: { type: Number, default: 0 },
    sem3: { type: Number, default: 0 },
    sem4: { type: Number, default: 0 },
    sem5: { type: Number, default: 0 },
    sem6: { type: Number, default: 0 },
    sem7: { type: Number, default: 0 },
    sem8: { type: Number, default: 0 }
  },
  assignments: [{
    title: String,
    marks: Number,
    totalMarks: Number,
    date: Date
  }],
  fees: {
    totalFees: { type: Number, default: 0 },
    paidFees: { type: Number, default: 0 },
    pendingFees: { type: Number, default: 0 },
    collegeFee: { type: Number, default: 0 },
    hostelFee: { type: Number, default: 0 },
    transportationFee: { type: Number, default: 0 },
    breakageFee: { type: Number, default: 0 }
  },
  attendance: {
    totalClasses: { type: Number, default: 0 },
    attendedClasses: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }
  },
  transportation: {
    busName: { type: String, default: '' },
    boardingPoint: { type: String, default: '' },
    time: { type: String, default: '' }
  },
  timetableUrl: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
