const mongoose = require('mongoose');

const admissionApplicationSchema = new mongoose.Schema({
  applicationNumber: { type: String, unique: true },
  phoneNumber: { type: String, required: true },

  // ── Personal Details ───────────────────────────────────────────────────────
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  whatsappNumber: { type: String },
  dateOfBirth: { type: String },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  community: { type: String, default: '' },
  nationality: { type: String, default: 'Indian' },

  // ── Parent Details ─────────────────────────────────────────────────────────
  parentName: { type: String, required: true },
  parentMobile: { type: String, required: true },

  // ── Address ────────────────────────────────────────────────────────────────
  address: {
    street: { type: String, default: '' },
    district: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' }
  },

  // ── 10th Details ───────────────────────────────────────────────────────────
  tenthSchool: { type: String, default: '' },
  tenthPlace: { type: String, default: '' },
  tenthBoard: { type: String, default: '' },
  tenthBatch: { type: String, default: '' },
  tenthPercentage: { type: Number, default: 0 },

  // ── 12th Details ───────────────────────────────────────────────────────────
  twelfthRegNumber: { type: String, default: '' },
  twelfthSchool: { type: String, default: '' },
  twelfthPlace: { type: String, default: '' },
  twelfthBoard: { type: String, default: '' },
  twelfthBatch: { type: String, default: '' },
  twelfthPercentage: { type: Number, default: 0 },
  twelfthMedium: { type: String, default: '' },
  twelfthMaths: { type: Number, default: 0 },
  twelfthPhysics: { type: Number, default: 0 },
  twelfthChemistry: { type: Number, default: 0 },
  twelfthMathsIIA: { type: Number, default: 0 },
  twelfthMathsIIB: { type: Number, default: 0 },
  twelfthPhysicsTheory: { type: Number, default: 0 },
  twelfthPhysicsLab: { type: Number, default: 0 },
  twelfthChemistryTheory: { type: Number, default: 0 },
  twelfthChemistryLab: { type: Number, default: 0 },
  twelfthCutoff: { type: Number, default: 0 },

  // ── Course Preferences ─────────────────────────────────────────────────────
  courseChoice1: { type: String, default: '' },
  courseChoice2: { type: String, default: '' },
  courseChoice3: { type: String, default: '' },

  // ── Application Meta ───────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'rejected'],
    default: 'submitted'
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewNotes: { type: String, default: '' }
}, { timestamps: true });

// Auto-generate application number before saving
admissionApplicationSchema.pre('save', async function (next) {
  if (!this.applicationNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('AdmissionApplication').countDocuments();
    this.applicationNumber = `Velammalitech-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('AdmissionApplication', admissionApplicationSchema);
