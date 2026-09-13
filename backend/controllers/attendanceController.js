const AttendanceRecord = require('../models/AttendanceRecord');

exports.getAttendanceRecords = async (req, res) => {
  try {
    const { department, date } = req.query;
    let query = {};
    
    if (department) {
      query.department = { $regex: new RegExp(`^${department}$`, 'i') };
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

exports.sendAlerts = async (req, res) => {
  try {
    const { department, date } = req.body;
    if (!department || !date) {
      return res.status(400).json({ error: 'Department and date are required.' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const records = await AttendanceRecord.find({
      department: { $regex: new RegExp(`^${department}$`, 'i') },
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('absentees').populate('leave');

    if (records.length === 0) {
      return res.status(404).json({ error: 'No attendance records found for this department on this date.' });
    }

    const whatsappService = require('../services/whatsappService');
    const dateStr = new Date(date).toLocaleDateString('en-IN');
    let messagesSent = 0;
    
    // Create a Set to track students we've already notified to prevent duplicates
    const notifiedStudents = new Set();

    for (const record of records) {
      const processStudents = async (students, actionWord) => {
        for (const student of students) {
          if (!student || notifiedStudents.has(student._id.toString())) continue;
          
          notifiedStudents.add(student._id.toString());
          
          const studentMsg = `⚠️ *Attendance Alert*\n\nDear ${student.name},\nYou have been marked as *${actionWord}* today (${dateStr}) for ${department.toUpperCase()} - Section ${record.section}.\n\nIf this is a mistake, please contact your class advisor immediately.`;
          const parentMsg = `⚠️ *Velammal Attendance Alert*\n\nDear Parent,\nYour ward *${student.name}* (Reg: ${student.regNumber}) has been marked as *${actionWord}* today (${dateStr}).\n\nIf you are unaware of this, please contact the department.`;
          
          if (student.phoneNumber) {
            whatsappService.sendTextMessage(student.phoneNumber, studentMsg).catch(e => console.error(`Failed to notify student:`, e.message));
            messagesSent++;
          }
          if (student.parentPhoneNumber) {
            whatsappService.sendTextMessage(student.parentPhoneNumber, parentMsg).catch(e => console.error(`Failed to notify parent:`, e.message));
            messagesSent++;
          }
        }
      };

      await processStudents(record.absentees, 'Absent');
      await processStudents(record.leave, 'on Leave');
    }

    res.json({ message: `Successfully dispatched alerts. (Approx ${messagesSent} messages sent)` });
  } catch (err) {
    console.error('Error in sendAlerts:', err);
    res.status(500).json({ error: 'Failed to send alerts: ' + err.message });
  }
};
