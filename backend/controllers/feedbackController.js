const FoodFeedback = require('../models/FoodFeedback');
const path = require('path');

exports.getFeedbackSummary = async (req, res) => {
  try {
    // Get date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const summary = await FoodFeedback.aggregate([
      {
        $match: {
          date: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          avgBreakfast: { $avg: "$breakfastRating" },
          avgLunch: { $avg: "$lunchRating" },
          avgDinner: { $avg: "$dinnerRating" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Format output for Recharts
    const formattedData = summary.map(item => ({
      date: item._id,
      Breakfast: Math.round(item.avgBreakfast * 10) / 10,
      Lunch: Math.round(item.avgLunch * 10) / 10,
      Dinner: Math.round(item.avgDinner * 10) / 10,
      Count: item.count
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching feedback summary:', error);
    res.status(500).json({ message: 'Server error fetching feedback data' });
  }
};

exports.getDailyDistribution = async (req, res) => {
  try {
    const queryDate = req.query.date ? new Date(req.query.date) : new Date();
    
    // Start of the day (00:00:00)
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);

    // End of the day (23:59:59)
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const feedbacks = await FoodFeedback.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    let avgBreakfast = 0;
    let avgLunch = 0;
    let avgDinner = 0;

    if (feedbacks.length > 0) {
      avgBreakfast = feedbacks.reduce((sum, f) => sum + f.breakfastRating, 0) / feedbacks.length;
      avgLunch = feedbacks.reduce((sum, f) => sum + f.lunchRating, 0) / feedbacks.length;
      avgDinner = feedbacks.reduce((sum, f) => sum + f.dinnerRating, 0) / feedbacks.length;
    }

    res.json({
      date: startOfDay.toISOString().split('T')[0],
      totalVotes: feedbacks.length,
      breakfast: [{ name: 'Breakfast', value: Number(avgBreakfast.toFixed(1)) }],
      lunch: [{ name: 'Lunch', value: Number(avgLunch.toFixed(1)) }],
      dinner: [{ name: 'Dinner', value: Number(avgDinner.toFixed(1)) }]
    });
  } catch (error) {
    console.error('Error fetching daily distribution:', error);
    res.status(500).json({ message: 'Server error fetching daily distribution' });
  }
};

exports.getFeedbackForm = (req, res) => {
  res.sendFile(path.join(__dirname, '../public/feedback.html'));
};

exports.submitFeedback = async (req, res) => {
  const { studentId, breakfast, lunch, dinner } = req.body;
  if (!studentId || !breakfast || !lunch || !dinner) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    await FoodFeedback.create({
      studentId,
      breakfastRating: breakfast,
      lunchRating: lunch,
      dinnerRating: dinner,
      date: new Date()
    });

    const ChatSession = require('../models/ChatSession');
    const session = await ChatSession.findOne({ studentId });
    if (session) {
      session.currentState = 'registered_welcome';
      await session.save();
      
      const Student = require('../models/Student');
      const student = await Student.findById(studentId);
      const whatsappService = require('../services/whatsappService');
      await whatsappService.sendTextMessage(session.phoneNumber, '✅ Your food feedback was successfully recorded via the web form!');
      await whatsappService.sendRegisteredWelcome(session.phoneNumber, student?.name);
    }

    res.json({ message: 'Feedback saved successfully' });
  } catch (error) {
    console.error('Error saving feedback via web form:', error);
    res.status(500).json({ message: 'Failed to save feedback' });
  }
};

// ── Helpdesk Issue Tickets ──────────────────────────────────────────────────
const IssueTicket = require('../models/IssueTicket');

exports.getIssues = async (req, res) => {
  try {
    const issues = await IssueTicket.find()
      .populate('studentId', 'regNumber name branch section')
      .sort({ createdAt: -1 });
    res.json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ error: 'Server error fetching issues' });
  }
};

exports.updateIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminMessage } = req.body;
    
    const issue = await IssueTicket.findById(id).populate('studentId', 'name phoneNumber');
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    
    if (status) issue.status = status;
    if (adminMessage !== undefined) issue.adminMessage = adminMessage;
    
    await issue.save();
    
    // Send WhatsApp notification
    const whatsappService = require('../services/whatsappService');
    const ChatSession = require('../models/ChatSession');
    
    // Find the session to get the exact phone number they used (or fallback to student.phoneNumber)
    let phoneNumber = issue.studentId?.phoneNumber;
    const session = await ChatSession.findOne({ studentId: issue.studentId._id });
    if (session && session.phoneNumber) phoneNumber = session.phoneNumber;
    
    if (phoneNumber) {
      let message = '';
      if (status === 'Under Review') {
        message = `🎫 *Ticket ${issue.ticketId} Update*\n\nThe admin has seen your problem and it will be verified shortly.`;
      } else if (status === 'Resolved') {
        message = `✅ *Ticket ${issue.ticketId} Resolved*\n\nYour reported issue has been solved.`;
      }
      
      if (adminMessage) {
        message += `\n\n*Admin Note:* ${adminMessage}`;
      }
      
      if (message) {
        await whatsappService.sendTextMessage(phoneNumber, message);
      }
    }
    
    res.json(issue);
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ error: 'Server error updating issue' });
  }
};

// ── Staff Issue Tickets ──────────────────────────────────────────────────
const StaffIssue = require('../models/StaffIssue');

exports.getStaffIssues = async (req, res) => {
  try {
    const issues = await StaffIssue.find()
      .populate('staffId', 'name department mobileNumber')
      .sort({ createdAt: -1 });
    res.json(issues);
  } catch (error) {
    console.error('Error fetching staff issues:', error);
    res.status(500).json({ error: 'Server error fetching staff issues' });
  }
};

exports.updateStaffIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminMessage } = req.body;
    
    const issue = await StaffIssue.findById(id).populate('staffId', 'name mobileNumber');
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    
    if (status) issue.status = status;
    if (adminMessage !== undefined) issue.adminMessage = adminMessage;
    
    await issue.save();
    
    // Notify via WhatsApp (using mobileNumber directly as fallback)
    const whatsappService = require('../services/whatsappService');
    const phoneNumber = issue.staffId?.mobileNumber;
    
    if (phoneNumber) {
      let message = '';
      if (status === 'Under Review') {
        message = `🎫 *Staff Ticket ${issue.ticketId} Update*\n\nThe Principal has seen your issue.`;
      } else if (status === 'Resolved') {
        message = `✅ *Staff Ticket ${issue.ticketId} Resolved*\n\nYour reported issue has been solved.`;
      }
      
      if (adminMessage) {
        message += `\n\n*Admin Note:* ${adminMessage}`;
      }
      
      if (message) {
        await whatsappService.sendTextMessage(phoneNumber, message);
      }
    }
    
    res.json(issue);
  } catch (error) {
    console.error('Error updating staff issue:', error);
    res.status(500).json({ error: 'Server error updating staff issue' });
  }
};

// ── Warden Issue Tickets ──────────────────────────────────────────────────
const WardenIssue = require('../models/WardenIssue');

exports.getWardenIssues = async (req, res) => {
  try {
    const issues = await WardenIssue.find()
      .populate('wardenId', 'name mobileNumber block')
      .sort({ createdAt: -1 });
    res.json(issues);
  } catch (error) {
    console.error('Error fetching warden issues:', error);
    res.status(500).json({ error: 'Server error fetching warden issues' });
  }
};

exports.updateWardenIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminMessage } = req.body;
    
    const issue = await WardenIssue.findById(id).populate('wardenId', 'name mobileNumber');
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    
    if (status) issue.status = status;
    if (adminMessage !== undefined) issue.adminMessage = adminMessage;
    
    await issue.save();
    
    const whatsappService = require('../services/whatsappService');
    const phoneNumber = issue.wardenId?.mobileNumber;
    
    if (phoneNumber) {
      let message = '';
      if (status === 'Under Review') {
        message = `🎫 *Warden Ticket ${issue.ticketId} Update*\n\nThe Principal has seen your issue.`;
      } else if (status === 'Resolved') {
        message = `✅ *Warden Ticket ${issue.ticketId} Resolved*\n\nYour reported issue has been solved.`;
      }
      
      if (adminMessage) {
        message += `\n\n*Admin Note:* ${adminMessage}`;
      }
      
      if (message) {
        await whatsappService.sendTextMessage(phoneNumber, message);
      }
    }
    
    res.json(issue);
  } catch (error) {
    console.error('Error updating warden issue:', error);
    res.status(500).json({ error: 'Server error updating warden issue' });
  }
};
