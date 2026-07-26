const Outing = require('../models/Outing');

// Get all outings (Active, Returned, Pending)
exports.getActiveOutings = async (req, res) => {
  try {
    const outings = await Outing.find({})
      .populate('studentId', 'name registrationNumber mobileNumber department')
      .populate('wardenId', 'name block')
      .sort({ requestTime: -1 })
      .limit(100);
    res.json(outings);
  } catch (err) {
    console.error('Error fetching active outings:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all late comers (Status: 'Out' and expectedReturnTime < now)
exports.getLateComers = async (req, res) => {
  try {
    const now = new Date();
    
    // We want to find students who are currently "Out"
    // and whose expectedReturnTime is in the past.
    const lateComers = await Outing.find({ 
      status: 'Out',
      expectedReturnTime: { $lt: now }
    })
      .populate('studentId', 'name registrationNumber mobileNumber parentPhoneNumber department')
      .populate('wardenId', 'name block')
      .sort({ expectedReturnTime: 1 });
      
    res.json(lateComers);
  } catch (err) {
    console.error('Error fetching late comers:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
