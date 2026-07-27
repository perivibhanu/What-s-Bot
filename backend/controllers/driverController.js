const Driver = require('../models/Driver');

exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json(drivers);
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).json({ error: 'Server error fetching drivers' });
  }
};

exports.addDriver = async (req, res) => {
  try {
    const { name, mobileNumber, busNumber, routeNumber } = req.body;
    if (!name || !mobileNumber || !busNumber || !routeNumber) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const newDriver = new Driver({
      name,
      mobileNumber,
      busNumber,
      routeNumber
    });

    await newDriver.save();
    res.status(201).json(newDriver);
  } catch (err) {
    console.error('Error adding driver:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A driver with this mobile number already exists.' });
    }
    res.status(500).json({ error: 'Server error adding driver' });
  }
};

exports.deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found.' });
    }
    res.json({ message: 'Driver deleted successfully.' });
  } catch (err) {
    console.error('Error deleting driver:', err);
    res.status(500).json({ error: 'Server error deleting driver' });
  }
};
