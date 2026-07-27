const SecurityGuard = require('../models/SecurityGuard');

exports.getAllSecurityGuards = async (req, res) => {
  try {
    const guards = await SecurityGuard.find().sort({ createdAt: -1 });
    res.json(guards);
  } catch (err) {
    console.error('Error fetching security guards:', err);
    res.status(500).json({ error: 'Server error fetching security guards' });
  }
};

exports.addSecurityGuard = async (req, res) => {
  try {
    const { name, mobileNumber, gateAssigned, shift } = req.body;
    if (!name || !mobileNumber) {
      return res.status(400).json({ error: 'Name and Mobile Number are required.' });
    }

    const newGuard = new SecurityGuard({
      name,
      mobileNumber,
      gateAssigned: gateAssigned || 'Gate 1 (Hostel Gate)',
      shift: shift || 'Day Shift'
    });

    await newGuard.save();
    res.status(201).json(newGuard);
  } catch (err) {
    console.error('Error adding security guard:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A security guard with this mobile number already exists.' });
    }
    res.status(500).json({ error: 'Server error adding security guard' });
  }
};

exports.deleteSecurityGuard = async (req, res) => {
  try {
    const guard = await SecurityGuard.findByIdAndDelete(req.params.id);
    if (!guard) {
      return res.status(404).json({ error: 'Security guard not found.' });
    }
    res.json({ message: 'Security guard deleted successfully.' });
  } catch (err) {
    console.error('Error deleting security guard:', err);
    res.status(500).json({ error: 'Server error deleting security guard' });
  }
};
