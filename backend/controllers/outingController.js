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

// Scan Gate QR Code (Gate 1 & Gate 2 Exit/Return)
exports.scanGateQR = async (req, res) => {
  try {
    const { qrToken, gateNumber, direction } = req.body;
    if (!qrToken) {
      return res.status(400).json({ error: 'QR Token is required' });
    }

    const outing = await Outing.findOne({ qrToken }).populate('studentId', 'name registrationNumber mobileNumber parentPhoneNumber department').populate('wardenId', 'name block');
    if (!outing) {
      return res.status(404).json({ error: 'Invalid or Expired Outing Pass QR Code' });
    }

    if (outing.status === 'Rejected') {
      return res.status(403).json({ error: 'This Outing Request was REJECTED by the Warden.' });
    }

    const now = new Date();

    if (direction === 'exit') {
      if (Number(gateNumber) === 1) {
        outing.gate1ExitTime = now;
      } else if (Number(gateNumber) === 2) {
        outing.gate2ExitTime = now;
        // Alert parent
        const stu = outing.studentId || {};
        if (stu.parentPhoneNumber) {
          const whatsappService = require('../services/whatsappService');
          await whatsappService.sendTextMessage(stu.parentPhoneNumber,
            `📢 *VELAMMAL SECURITY ALERT*\n\n` +
            `Your ward *${stu.name} (${stu.registrationNumber})* has checked OUT at Main Campus Gate 2 for an approved outing.\n` +
            `🕒 *Exit Time:* ${now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`
          );
        }
      }
    } else if (direction === 'entry') {
      if (Number(gateNumber) === 2) {
        outing.gate2ReturnTime = now;
      } else if (Number(gateNumber) === 1) {
        outing.gate1ReturnTime = now;
        outing.status = 'Returned';
        outing.actualReturnTime = now;
        // Alert parent & warden
        const stu = outing.studentId || {};
        const warden = outing.wardenId || {};
        const whatsappService = require('../services/whatsappService');
        if (stu.parentPhoneNumber) {
          await whatsappService.sendTextMessage(stu.parentPhoneNumber,
            `✅ *VELAMMAL SECURITY ALERT*\n\n` +
            `Your ward *${stu.name} (${stu.registrationNumber})* has safely returned to the Hostel (Gate 1).\n` +
            `🕒 *Return Time:* ${now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`
          );
        }
        if (warden.mobileNumber) {
          await whatsappService.sendTextMessage(warden.mobileNumber,
            `✅ *Student Return Confirmed (QR Scan)*\n\n` +
            `Student *${stu.name} (${stu.registrationNumber})* checked into Hostel Gate 1 at ${now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}.`
          );
        }
      }
    }

    await outing.save();

    res.json({
      success: true,
      outing,
      message: `Gate ${gateNumber} (${direction.toUpperCase()}) recorded successfully for ${outing.studentId?.name}`
    });
  } catch (err) {
    console.error('Error in scanGateQR:', err);
    res.status(500).json({ error: 'Server error during QR scan' });
  }
};
