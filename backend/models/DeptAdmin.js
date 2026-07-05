const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deptAdminSchema = new mongoose.Schema({
  department: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });

deptAdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

deptAdminSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('DeptAdmin', deptAdminSchema);
