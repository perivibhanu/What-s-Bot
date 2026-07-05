const Admin = require('../models/Admin');
const DeptAdmin = require('../models/DeptAdmin');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id, role: 'super_admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin._id, username: admin.username, email: admin.email, role: 'super_admin' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deptLogin = async (req, res) => {
  try {
    const { department, username, password } = req.body;
    const admin = await DeptAdmin.findOne({ department, username });
    
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id, role: 'dept_admin', dept: admin.department }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin._id, username: admin.username, department: admin.department, role: 'dept_admin' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const admin = await Admin.create(req.body);
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, admin: { id: admin._id, username: admin.username, email: admin.email } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
