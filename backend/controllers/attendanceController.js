const AttendanceRecord = require('../models/AttendanceRecord');

exports.getAttendanceRecords = async (req, res) => {
  try {
    const { department, date } = req.query;
    let query = {};
    
    if (department) {
      query.department = department;
    }
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const records = await AttendanceRecord.find(query)
      .populate('absentees', 'name regNumber branch section year')
      .populate('leave', 'name regNumber branch section year')
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
