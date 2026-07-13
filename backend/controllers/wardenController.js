const Warden = require('../models/Warden');

// Get all wardens
exports.getAllWardens = async (req, res) => {
  try {
    const wardens = await Warden.find().sort({ createdAt: -1 });
    res.json(wardens);
  } catch (err) {
    console.error('Error fetching wardens:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create a new warden
exports.createWarden = async (req, res) => {
  try {
    const { name, mobileNumber, block, yearHead } = req.body;

    // Check if mobile number already exists
    const existingWarden = await Warden.findOne({ mobileNumber });
    if (existingWarden) {
      return res.status(400).json({ error: 'Warden with this mobile number already exists' });
    }

    const warden = new Warden({
      name,
      mobileNumber,
      block,
      yearHead
    });

    await warden.save();
    res.status(201).json(warden);
  } catch (err) {
    console.error('Error creating warden:', err);
    res.status(500).json({ error: 'Server error while creating warden' });
  }
};

// Update a warden
exports.updateWarden = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobileNumber, block, yearHead } = req.body;

    // Check if another warden has this mobile number
    const existingWarden = await Warden.findOne({ mobileNumber, _id: { $ne: id } });
    if (existingWarden) {
      return res.status(400).json({ error: 'Another warden with this mobile number already exists' });
    }

    const warden = await Warden.findByIdAndUpdate(
      id,
      { name, mobileNumber, block, yearHead },
      { new: true, runValidators: true }
    );

    if (!warden) {
      return res.status(404).json({ error: 'Warden not found' });
    }

    res.json(warden);
  } catch (err) {
    console.error('Error updating warden:', err);
    res.status(500).json({ error: 'Server error while updating warden' });
  }
};

// Delete a warden
exports.deleteWarden = async (req, res) => {
  try {
    const { id } = req.params;
    const warden = await Warden.findByIdAndDelete(id);

    if (!warden) {
      return res.status(404).json({ error: 'Warden not found' });
    }

    res.json({ message: 'Warden deleted successfully' });
  } catch (err) {
    console.error('Error deleting warden:', err);
    res.status(500).json({ error: 'Server error while deleting warden' });
  }
};
