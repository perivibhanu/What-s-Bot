const ChatSession = require('../models/ChatSession');
const Student = require('../models/Student');
const Settings = require('../models/Settings');
const AdmissionApplication = require('../models/AdmissionApplication');
const whatsappService = require('./whatsappService');

// ─── Normalize phone to digits only (for comparison) ─────────────────────────
const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1);
  return digits;
};

class ChatService {
  async handleIncomingMessage(from, message) {
    let session = await ChatSession.findOne({ phoneNumber: from });

    if (!session) {
      session = await ChatSession.create({ phoneNumber: from, currentState: 'initial' });
    } else {
      // 🛡️ Check Rate Limit (1.5 seconds cooldown)
      const rateLimitMs = 1500;
      const now = new Date();
      const last = new Date(session.lastInteraction || session.updatedAt);
      if (now - last < rateLimitMs) {
        console.warn(`⚠️ Rate limit hit for ${from}. Ignoring message.`);
        return;
      }

      // ⏳ Check session expiry (30 minutes of inactivity)
      const sessionTimeoutMs = 30 * 60 * 1000;
      if (now - last > sessionTimeoutMs) {
        console.log(`⏳ Session inactive (>30m) for ${from}. Resetting to role welcome or visitor menu.`);
        if (session.userType === 'student' && session.studentId) {
          session.currentState = 'registered_welcome';
        } else if (session.userType === 'staff' && session.staffId) {
          session.currentState = 'staff_welcome';
        } else if (session.userType === 'warden' && session.wardenId) {
          session.currentState = 'warden_welcome';
        } else if (session.userType === 'security' && session.securityId) {
          session.currentState = 'security_welcome';
        } else if (session.userType === 'parent' && session.studentId) {
          session.currentState = 'parent_welcome';
        } else {
          session.currentState = 'initial';
          session.tempRegNumber = undefined;
          session.userType = 'visitor';
        }
      }
    }

    session.lastInteraction = new Date();

    // Extract message text
    let messageText = '';
    if (message.type === 'text') {
      messageText = message.text.body.trim();
    } else if (message.type === 'interactive') {
      const interactive = message.interactive;
      if (interactive.type === 'button_reply') messageText = interactive.button_reply.id;
      else if (interactive.type === 'list_reply') messageText = interactive.list_reply.id;
      else if (interactive.type === 'nfm_reply') {
        try {
          const payload = JSON.parse(interactive.nfm_reply.response_json || '{}');
          if (payload.service) messageText = payload.service;
        } catch (e) {
          console.error('Error parsing NFM reply:', e);
        }
      }
    }

    await this.processMessage(session, messageText, from, message);
    await session.save();
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  async processMessage(session, messageText, from, rawMessage = null) {
    // ── Handle GPS Location for Outing Return ──────────────────────────────────────────
    if (rawMessage && rawMessage.type === 'location' && rawMessage.location) {
      const { latitude, longitude } = rawMessage.location;
      // Velammal Institute of Technology Coordinates: 13°53'55.3"N 79°55'41.0"E
      const COLLEGE_LAT = 13.898697;
      const COLLEGE_LON = 79.928052;
      const distance = this.calculateDistance(latitude, longitude, COLLEGE_LAT, COLLEGE_LON);
      console.log(`📍 Location received from ${from}: (${latitude}, ${longitude}) - Distance to campus: ${distance.toFixed(2)} km`);

      const Outing = require('../models/Outing');
      const outing = await Outing.findOne({
        studentId: session.studentId,
        status: 'Out'
      }).sort({ requestTime: -1 });

      if (!outing) {
        session.currentState = 'initial';
        await session.save();
        return whatsappService.sendTextMessage(from,
          `❌ *Not Eligible for Outing Return*\n\n` +
          `You do not have an active approved outing permit in 'Out' status. Only students who have received warden permission and left campus can use the Outing Return check-in.`
        );
      }

      if (distance <= 1.0) {
        if (outing) {
          outing.status = 'Returned';
          outing.actualReturnTime = new Date();
          await outing.save();
        }
        session.currentState = 'initial';
        await whatsappService.sendTextMessage(from,
          `✅ *Outing Return Verified!*\n\n` +
          `📍 *Location Check:* Verified within Campus (${distance.toFixed(2)} km from college center)\n` +
          `🕒 *Return Time:* ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
          `Welcome back to Velammal Institute of Technology! Your return has been automatically recorded in the hostel system.`
        );
        return whatsappService.sendMainMenuButton(from);
      } else {
        await whatsappService.sendTextMessage(from,
          `❌ *Location Verification Failed*\n\n` +
          `Your current location is *${distance.toFixed(2)} km* away from campus.\n` +
          `Outing check-in is only permitted within a *1 km radius* of Velammal Institute of Technology (13.898697, 79.928052).\n\n` +
          `Please try checking in again when you reach the college campus.`
        );
        return whatsappService.sendLocationRequest(from,
          "📍 *Try Outing Check-In Again*\n\nTap below to re-share your current location once you arrive on campus."
        );
      }
    }

    const msgLower = messageText.toLowerCase();
    const isGreeting = ['hi', 'hello', 'hey', 'start', 'hii', 'hai'].includes(msgLower);
    const isSwitchPortal = ['portal', 'choose portal', 'switch portal', 'change portal', 'categories', '0', 'switch_portal', 'btn_switch_portal'].includes(msgLower);

    // ── Check if user is an already registered student when greeting or returning to main menu ─
    if (isGreeting || ['menu', 'main menu', 'main_menu', 'back'].includes(msgLower)) {
      let student = null;
      if (session.userType === 'student' && session.studentId) {
        student = await Student.findById(session.studentId);
      }
      if (!student) {
        const senderPhone = normalizePhone(from);
        student = await Student.findOne({
          $or: [
            { contactDetails: { $regex: senderPhone + '$' } },
            { parentContact: { $regex: senderPhone + '$' } }
          ],
          isRegistered: true
        });
      }

      if (student) {
        session.userType = 'student';
        session.studentId = student._id;
        session.currentState = 'registered_welcome';
        await session.save();
        return whatsappService.sendRegisteredWelcome(from, student);
      }

      session.currentState = 'visitor_welcome';
      await session.save();
      return whatsappService.sendMasterCategoryMenu(from);
    }

    if (isSwitchPortal) {
      session.currentState = 'visitor_welcome';
      await session.save();
      return whatsappService.sendMasterCategoryMenu(from);
    }

    // ── Handle Welcome Message 3 Buttons & Citizen Services ──────────────────
    if (['btn_choose_service', 'btn_student_choose_service', 'choose service', 'service', 'services'].includes(msgLower)) {
      if (session.userType === 'student' && session.studentId) {
        const student = await Student.findById(session.studentId);
        if (student) {
          session.currentState = 'registered_welcome';
          await session.save();
          return whatsappService.sendStudentServicesList(from, student);
        }
      }
      session.currentState = 'admission_welcome';
      await session.save();
      return whatsappService.sendCitizenServicesList(from);
    }

    if (['btn_admission', 'admission', 'apply online', 'portal_admission'].includes(msgLower)) {
      session.userType = 'visitor';
      session.currentState = 'admission_welcome';
      await session.save();
      return whatsappService.sendAdmissionLinkCard(from);
    }

    if (['btn_language', 'te', 'telugu', 'english', 'language'].includes(msgLower)) {
      return whatsappService.sendLanguageInfoCard(from);
    }

    if (msgLower === 'more_options') {
      if (session.currentTopic && session.currentTopic.startsWith('dept_')) {
        const parts = session.currentTopic.split('_');
        const deptKey = parts[1];
        if (deptKey) {
          return whatsappService.sendDeptMoreOptionsMenu(from, deptKey.toUpperCase(), deptKey);
        }
      }
      session.currentState = 'admission_welcome';
      await session.save();
      return whatsappService.sendCitizenServicesList(from);
    }

    if (['main_menu', 'explore', 'back_to_main'].includes(msgLower)) {
      session.currentState = 'admission_welcome';
      await session.save();
      return whatsappService.sendCitizenServicesList(from);
    }

    if (msgLower === 'back_to_dept') {
      session.currentState = 'about_dept';
      await session.save();
      return whatsappService.sendDeptSubMenu(from);
    }

    if (['student_login', 'registration', 'portal_student'].includes(msgLower)) {
      session.userType = 'student';
      session.currentState = 'awaiting_reg_number';
      await session.save();
      return whatsappService.sendTextMessage(from,
        '🎓 *Velammal Registration & Login*\n\n' +
        'Please enter your 10-12 digit *Register Number* (e.g. 113323106071) to login to your portal:'
      );
    }

    if (msgLower.startsWith('topic_')) {
      const topicKey = msgLower.replace('topic_', '');
      if (topicKey === 'dept') {
        session.currentState = 'about_dept';
        await session.save();
        return whatsappService.sendDeptSubMenu(from);
      }
      session.currentState = 'about_topic';
      session.currentTopic = topicKey;
      await session.save();
      return whatsappService.sendCollegeTopicMedia(from, topicKey);
    }

    const topicMap = {
      'placements': 'placements',
      'placement': 'placements',
      'projects': 'projects',
      'project': 'projects',
      'academics': 'academics',
      'academic': 'academics',
      'achievements': 'achievements',
      'achievement': 'achievements',
      'hostel': 'hostel',
      'transportation': 'transportation',
      'transport': 'transportation',
      'bus': 'transportation',
      'sports': 'sports',
      'hospital': 'hospital',
      'medical': 'hospital',
      'hostel food': 'hostelFood',
      'food': 'hostelFood',
      'mess': 'hostelFood',
      'departments': 'dept',
      'department': 'dept',
      'dept': 'dept'
    };
    if (topicMap[msgLower]) {
      const topicKey = topicMap[msgLower];
      if (topicKey === 'dept') {
        session.currentState = 'about_dept';
        await session.save();
        return whatsappService.sendDeptSubMenu(from);
      }
      session.currentState = 'about_topic';
      session.currentTopic = topicKey;
      await session.save();
      return whatsappService.sendCollegeTopicMedia(from, topicKey);
    }

    if (msgLower.startsWith('adm_') || msgLower.startsWith('dept_')) {
      session.currentState = 'admission_welcome';
      await session.save();
      return this.handleAdmissionAction(session, msgLower, from);
    }

    if (msgLower === 'portal_staff') {
      const Staff = require('../models/Staff');
      const staffList = await Staff.find({});
      const staffMember = staffList.find(s => normalizePhone(s.contactDetails) === normalizePhone(from));
      if (staffMember) {
        session.userType = 'staff';
        session.staffId = staffMember._id;
        session.currentState = 'staff_welcome';
        await session.save();
        return whatsappService.sendStaffWelcome(from, staffMember.name);
      } else {
        return whatsappService.sendTextMessage(from,
          '👔 *Faculty & Staff Portal*\n\n' +
          'Your mobile number is not currently registered as Faculty or Lab Assistant in the database.\n' +
          'Please register your WhatsApp mobile number in the Velammal Admin Panel under *Staff Management* to access this portal.\n\n' +
          'Type *0* or *Menu* to return to Category Selector.'
        );
      }
    }

    if (msgLower === 'portal_warden') {
      const Warden = require('../models/Warden');
      const wardenList = await Warden.find({});
      const wardenMember = wardenList.find(w => normalizePhone(w.mobileNumber) === normalizePhone(from));
      if (wardenMember) {
        session.userType = 'warden';
        session.wardenId = wardenMember._id;
        session.currentState = 'warden_welcome';
        await session.save();
        return whatsappService.sendWardenWelcome(from, wardenMember.name, wardenMember.block);
      } else {
        return whatsappService.sendTextMessage(from,
          '👨‍✈️ *Hostel Warden Portal*\n\n' +
          'Your mobile number is not registered as an authorized Hostel Warden.\n' +
          'Please contact the Velammal Admin Panel under *Hostel Warden* to authorize this number.\n\n' +
          'Type *0* or *Menu* to return to Category Selector.'
        );
      }
    }

    if (msgLower === 'portal_parent') {
      session.userType = 'parent';
      session.currentState = 'awaiting_parent_reg';
      await session.save();
      return whatsappService.sendTextMessage(from,
        '👪 *Velammal Parents Portal*\n\n' +
        "Please enter your Child's 10-12 digit *Register Number* (e.g. 113323106071) to verify parent access:"
      );
    }

    if (msgLower === 'portal_security') {
      const SecurityGuard = require('../models/SecurityGuard');
      const guardList = await SecurityGuard.find({});
      const guardMember = guardList.find(g => normalizePhone(g.mobileNumber) === normalizePhone(from));
      if (guardMember) {
        session.userType = 'security';
        session.securityId = guardMember._id;
        session.currentState = 'security_welcome';
        await session.save();
        return whatsappService.sendSecurityGuardWelcome(from, guardMember.name, session.activeGate || guardMember.gateAssigned);
      } else {
        return whatsappService.sendTextMessage(from,
          '🛡️ *Security Guard Gate Scanner*\n\n' +
          'Your WhatsApp number is not registered as an authorized Security Guard.\n' +
          'Please contact the Velammal Admin Panel under *Security Guards* to authorize this number.\n\n' +
          'Type *0* or *Menu* to return to Category Selector.'
        );
      }
    }

    // ── Auto-detect staff, warden, security guard, or driver ────────────────────────────
    if (isGreeting) {
      const Warden = require('../models/Warden');
      const wardenList = await Warden.find({});
      const wardenMember = wardenList.find(w => normalizePhone(w.mobileNumber) === normalizePhone(from));
      if (wardenMember) {
        session.userType = 'warden';
        session.wardenId = wardenMember._id;
        session.currentState = 'warden_welcome';
        await session.save();
        return whatsappService.sendWardenWelcome(from, wardenMember.name, wardenMember.block);
      }

      const Staff = require('../models/Staff');
      const staffList = await Staff.find({});
      const staffMember = staffList.find(s => normalizePhone(s.contactDetails) === normalizePhone(from));
      if (staffMember) {
        session.userType = 'staff';
        session.staffId = staffMember._id;
        session.currentState = 'staff_welcome';
        await session.save();
        return whatsappService.sendStaffWelcome(from, staffMember.name);
      }

      const SecurityGuard = require('../models/SecurityGuard');
      const guardList = await SecurityGuard.find({});
      const guardMember = guardList.find(g => normalizePhone(g.mobileNumber) === normalizePhone(from));
      if (guardMember) {
        session.userType = 'security';
        session.securityId = guardMember._id;
        session.currentState = 'security_welcome';
        await session.save();
        return whatsappService.sendSecurityGuardWelcome(from, guardMember.name, session.activeGate || guardMember.gateAssigned);
      }

      const Driver = require('../models/Driver');
      const driverList = await Driver.find({});
      const driverMember = driverList.find(d => normalizePhone(d.mobileNumber) === normalizePhone(from));
      if (driverMember) {
        session.userType = 'driver';
        session.driverId = driverMember._id;
        session.currentState = 'driver_welcome';
        await session.save();
        return whatsappService.sendDriverWelcome(from, driverMember.name, driverMember.busNumber, driverMember.routeNumber);
      }
    }

    if (session.userType === 'staff' && isGreeting) {
      session.currentState = 'staff_welcome';
      const Staff = require('../models/Staff');
      const staffMember = await Staff.findById(session.staffId);
      return whatsappService.sendStaffWelcome(from, staffMember?.name);
    }

    if (session.userType === 'staff' && session.currentState === 'staff_welcome') {
      return this.handleStaffAction(session, msgLower, from);
    }

    if (session.userType === 'warden' && isGreeting) {
      session.currentState = 'warden_welcome';
      const Warden = require('../models/Warden');
      const wardenMember = await Warden.findById(session.wardenId);
      return whatsappService.sendWardenWelcome(from, wardenMember?.name, wardenMember?.block);
    }

    if (session.userType === 'warden') {
      return this.handleWardenAction(session, messageText, from);
    }

    if (session.userType === 'security' && isGreeting) {
      session.currentState = 'security_welcome';
      const SecurityGuard = require('../models/SecurityGuard');
      const guardMember = await SecurityGuard.findById(session.securityId);
      return whatsappService.sendSecurityGuardWelcome(from, guardMember?.name, session.activeGate || guardMember?.gateAssigned);
    }

    if (session.userType === 'security') {
      return this.handleSecurityGuardAction(session, messageText, from, rawMessage);
    }

    if (session.userType === 'driver' && isGreeting) {
      session.currentState = 'driver_welcome';
      const Driver = require('../models/Driver');
      const driverMember = await Driver.findById(session.driverId);
      return whatsappService.sendDriverWelcome(from, driverMember?.name, driverMember?.busNumber, driverMember?.routeNumber);
    }

    if (session.userType === 'driver') {
      return this.handleDriverAction(session, messageText, from);
    }

    // ── Already verified student sends greeting → show main menu ─────────────
    if (session.userType === 'student' && session.studentId && isGreeting) {
      session.currentState = 'registered_welcome';
      const student = await Student.findById(session.studentId);
      return whatsappService.sendRegisteredWelcome(from, student);
    }

    // ── Already verified parent sends greeting → show parent menu ────────────
    if (session.userType === 'parent' && session.studentId && isGreeting) {
      session.currentState = 'parent_welcome';
      const student = await Student.findById(session.studentId);
      return whatsappService.sendParentWelcome(from, student?.name);
    }

    // ── Already verified student in menu ─────────────────────────────────────
    if (session.userType === 'student' && session.studentId && session.currentState === 'registered_welcome') {
      return this.handleRegisteredUserAction(session, msgLower, from);
    }

    // ── Already verified parent in menu ──────────────────────────────────────
    if (session.userType === 'parent' && session.studentId && session.currentState === 'parent_welcome') {
      return this.handleParentAction(session, msgLower, from);
    }

    // ── Sub-department selected (e.g. subdept_cse → dept_cse) ───────────────────
    if (msgLower.startsWith('subdept_')) {
      const deptKey = 'dept_' + msgLower.replace('subdept_', '');
      session.currentState = 'about_topic';
      session.currentTopic = deptKey;
      return whatsappService.sendCollegeTopicMedia(from, deptKey);
    }

    // ── College topic selected ────────────────────────────────────────────────
    if (msgLower.startsWith('topic_')) {
      const topicKey = msgLower.replace('topic_', '');
      // "Departments" gets its own sub-menu (7 depts), not direct media
      if (topicKey === 'dept') {
        session.currentState = 'about_dept';
        return whatsappService.sendDeptSubMenu(from);
      }
      session.currentState = 'about_topic';
      session.currentTopic = topicKey;
      return whatsappService.sendCollegeTopicMedia(from, topicKey);
    }

    // ── State machine ─────────────────────────────────────────────────────────
    switch (session.currentState) {

      case 'initial':
        // Any message (greeting or otherwise) → show master category menu
        session.currentState = 'visitor_welcome';
        return whatsappService.sendMasterCategoryMenu(from);

      case 'visitor_welcome':
      case 'about_topic':
      case 'more_options':
        if (msgLower === 'student_login') {
          session.currentState = 'awaiting_reg_number';
          return whatsappService.sendTextMessage(from,
            '🎓 *Student Login*\n\nPlease enter your *Registration Number* to continue:'
          );
        }
        if (msgLower === 'about_college') {
          session.currentState = 'about_college';
          return whatsappService.sendAboutCollegeDetails(from);
        }
        if (msgLower === 'admission_start' || msgLower === 'admission') {
          session.currentState = 'admission_welcome';
          session.admissionStep = '';
          session.admissionData = {};
          return whatsappService.sendAdmissionWelcome(from);
        }
        if (msgLower === 'more_options') {
          session.currentState = 'more_options';
          const depts = ['aids', 'cse', 'ece', 'eee', 'it', 'mech', 'mechatronics'];
          
          if (session.currentTopic) {
             if (session.currentTopic.startsWith('dept_')) {
                const parts = session.currentTopic.split('_');
                return whatsappService.sendDeptMoreOptionsMenu(from, parts[1].toUpperCase(), parts[1]);
             }
             const parts = session.currentTopic.split('_');
             if (depts.includes(parts[0])) {
                return whatsappService.sendDeptMoreOptionsMenu(from, parts[0].toUpperCase(), parts[0]);
             }
          }
          return whatsappService.sendMoreOptionsMenu(from);
        }
        if (msgLower === 'back_to_dept') {
          session.currentState = 'about_dept';
          return whatsappService.sendDeptSubMenu(from);
        }
        // Greeting or Back resets to welcome
        if (isGreeting || msgLower === 'back_to_main') {
          session.currentState = 'visitor_welcome';
          return whatsappService.sendMasterCategoryMenu(from);
        }
        // Unknown → re-show welcome
        return whatsappService.sendMasterCategoryMenu(from);

      case 'about_college':
        if (msgLower === 'student_login') {
          session.currentState = 'awaiting_reg_number';
          return whatsappService.sendTextMessage(from,
            '🎓 *Student Login*\n\nPlease enter your *Registration Number* to continue:'
          );
        }
        if (msgLower === 'more_options') {
          session.currentState = 'more_options';
          return whatsappService.sendMoreOptionsMenu(from);
        }
        if (msgLower === 'back_to_main' || isGreeting) {
          session.currentState = 'visitor_welcome';
          return whatsappService.sendMasterCategoryMenu(from);
        }
        return whatsappService.sendAboutCollegeDetails(from);

      case 'about_dept':
        if (msgLower === 'student_login') {
          session.currentState = 'awaiting_reg_number';
          return whatsappService.sendTextMessage(from,
            '🎓 *Student Login*\n\nPlease enter your *Registration Number* to continue:'
          );
        }
        if (isGreeting) {
          session.currentState = 'visitor_welcome';
          return whatsappService.sendInitialWelcome(from);
        }
        // Re-show dept sub-menu
        return whatsappService.sendDeptSubMenu(from);


      case 'awaiting_reg_number':
        return this.handleVerification(session, messageText, from);

      case 'awaiting_scholar_type':
        return this.handleScholarType(session, messageText, from);

      case 'admission_welcome':
      case 'admission_flow':
        return this.handleAdmissionAction(session, msgLower, from);

      case 'registered_welcome':
        return this.handleRegisteredUserAction(session, msgLower, from);

      case 'parent_welcome':
        return this.handleParentAction(session, msgLower, from);

      case 'awaiting_issue_category':
      case 'awaiting_issue_description':
      case 'awaiting_outing_details':
        return this.handleHelpdeskIssue(session, msgLower, messageText, from);

      case 'awaiting_food_ratings':
        return this.handleAllFoodRatings(session, messageText, from);

      default:
        session.currentState = 'visitor_welcome';
        return whatsappService.sendInitialWelcome(from);
    }
  }

  async handleStaffAction(session, action, from) {
    const Staff = require('../models/Staff');
    const staffMember = await Staff.findById(session.staffId);
    if (!staffMember) {
      session.currentState = 'initial';
      session.staffId = null;
      session.userType = 'visitor';
      return whatsappService.sendTextMessage(from, 'Session expired. Please send "hi" to start again.');
    }

    switch (action) {
      case 'principal_circulars': {
        const Circular = require('../models/Circular');
        const circulars = await Circular.find({ status: 'sent', type: 'principal' }).sort({ sentAt: -1 }).limit(1);
        return whatsappService.sendLatestCirculars(from, circulars);
      }

      case 'hod_circulars': {
        const Circular = require('../models/Circular');
        const circulars = await Circular.find({
          status: 'sent',
          type: 'hod',
          department: staffMember.department
        }).sort({ sentAt: -1 }).limit(1);
        return whatsappService.sendLatestCirculars(from, circulars);
      }

      default:
        // Unknown input → re-show staff menu
        return whatsappService.sendStaffWelcome(from, staffMember.name);
    }
  }

  async handleAdmissionAction(session, action, from) {
    if (action === 'adm_placements') {
      await whatsappService.sendTextMessage(from,
        `💼 *Velammal Institute of Technology - Placement Excellence*\n\n` +
        `• *Highest Package:* 44 LPA\n` +
        `• *Placement Rate:* 95%+ across all branches\n` +
        `• *Top Recruiters:* Zoho, TCS, Cognizant, Amazon, Wipro, Bosch, Infosys, Qualcomm, Accenture\n\n` +
        `Our dedicated Training & Placement Cell provides 360-degree training in coding, aptitude, and soft skills from 2nd year onwards.`
      );
      return whatsappService.sendAdmissionWelcome(from);
    }

    if (action === 'adm_projects') {
      await whatsappService.sendTextMessage(from,
        `🔬 *Student Innovations & Research Labs*\n\n` +
        `• *Smart Campus IoT Lab* & AI Drone Innovation Centre\n` +
        `• *Smart India Hackathon (SIH)* Winners & National Finalists\n` +
        `• *Robotics & E-Vehicle Club* building solar/electric prototypes\n` +
        `• Funded research projects and incubation support for student startups.`
      );
      return whatsappService.sendAdmissionWelcome(from);
    }

    if (action === 'adm_academics') {
      await whatsappService.sendTextMessage(from,
        `📚 *Academic Excellence at Velammal*\n\n` +
        `• *Affiliated to Anna University* & NBA/NAAC Accredited\n` +
        `• *Faculty Ratio:* 1:15 with PhD & industry-experienced professors\n` +
        `• *Smart Classrooms* with digital boards, high-speed Wi-Fi & modern labs\n` +
        `• Regular guest lectures, value-added certification courses, and mentoring.`
      );
      return whatsappService.sendAdmissionWelcome(from);
    }

    if (action === 'adm_achievements') {
      await whatsappService.sendTextMessage(from,
        `🏆 *Institutional Trophies & Achievements*\n\n` +
        `• Top-ranked Engineering Institution in Chennai & Tiruvallur region\n` +
        `• Over 150+ Technical Symposium & Coding Hackathon trophies won nationally\n` +
        `• IEEE, ACM, and CSI active student chapters with international recognition.`
      );
      return whatsappService.sendAdmissionWelcome(from);
    }

    if (action === 'adm_hostel_food') {
      await whatsappService.sendTextMessage(from,
        `🏨 *Hostel Life & Mess Food*\n\n` +
        `• *Separate Hostels* for Boys & Girls within safe, secure campus\n` +
        `• *AC & Non-AC Rooms* available with 24/7 power backup and Wi-Fi\n` +
        `• *Nutritious Dining:* Pure hygienic mess serving delicious South Indian & North Indian menus (Breakfast, Lunch, Snacks, Dinner)\n` +
        `• Resident wardens, gym access, recreation halls, and RO water.`
      );
      return whatsappService.sendAdmissionWelcome(from);
    }

    if (action === 'adm_transport') {
      await whatsappService.sendTextMessage(from,
        `🚌 *College Bus & Transportation*\n\n` +
        `• *60+ Modern College Buses* covering all parts of Chennai, Tiruvallur, Ponneri, Red Hills, Tambaram, and Kanchipuram\n` +
        `• Experienced drivers, GPS tracking, and timely boarding/dropping\n` +
        `• Special bus services during exams and placement drives.`
      );
      return whatsappService.sendAdmissionWelcome(from);
    }

    if (action === 'adm_sports_hosp') {
      await whatsappService.sendTextMessage(from,
        `⚽ *Sports, Gym & Medical Facilities*\n\n` +
        `• *Sports Complex:* 400m Athletics Track, Cricket Ground, Basketball, Volleyball & Badminton courts\n` +
        `• *Modern Gymnasium:* Fully equipped fitness center for students\n` +
        `• *24/7 On-Campus Hospital:* Qualified doctors, nurses, infirmary beds, and emergency ambulance on standby.`
      );
      return whatsappService.sendAdmissionWelcome(from);
    }

    if (action === 'adm_location') {
      await whatsappService.sendTextMessage(from,
        `📍 *Velammal Institute of Technology Campus Location*\n\n` +
        `Velammal Knowledge Park, Chennai - Kolkatta Highway, Panchetti, Ponneri Taluk, Tiruvallur District - 601204.\n\n` +
        `🌐 *Google Maps Directions Link:*\nhttps://maps.app.goo.gl/VelammalITChennai`
      );
      return whatsappService.sendAdmissionWelcome(from);
    }

    if (action === 'adm_contact') {
      await whatsappService.sendTextMessage(from,
        `📞 *Talk to Admission Counselor*\n\n` +
        `Have questions about branches, fees, or eligibility? Speak directly to our Admissions Team:\n\n` +
        `📱 *Admission Helpline 1:* +91 98404 69096\n` +
        `📱 *Admission Helpline 2:* +91 80560 30067\n` +
        `📧 *Email:* admission@velammalitech.edu.in\n\n` +
        `🌐 *Apply Online:* https://velammalitech.edu.in/admission`
      );
      return whatsappService.sendAdmissionWelcome(from);
    }

    if (action === 'adm_departments') {
      session.currentState = 'admission_flow';
      await session.save();
      return whatsappService.sendAdmissionDepartmentMenu(from);
    }

    if (action === 'adm_main') {
      session.currentState = 'admission_welcome';
      await session.save();
      return whatsappService.sendAdmissionWelcome(from);
    }

    // ── STEP 3: Department-Specific Explore Options (Screenshot 2) ──
    if (action.startsWith('dept_exp_')) {
      const deptName = session.admissionStep || 'Department';
      if (action.includes('placements')) {
        await whatsappService.sendTextMessage(from, `💼 *${deptName} - Placement Records*\n\n• Excellent placement track record with top core & IT recruiters.\n• Dedicated domain training in ${deptName} technologies.\n\n🌐 *Apply for ${deptName}:* https://velammalitech.edu.in/admission`);
      } else if (action.includes('projects')) {
        await whatsappService.sendTextMessage(from, `🔬 *${deptName} - Research & Innovations*\n\n• Advanced laboratories, IoT/Robotics/AI setups, and student project incubators.\n• Ongoing student-led technical innovations.`);
      } else if (action.includes('academics')) {
        await whatsappService.sendTextMessage(from, `📚 *${deptName} - Academic Excellence*\n\n• Industry-aligned curriculum, experienced professors, and practical lab focus.\n• 100% lab utilization & mentoring.`);
      } else if (action.includes('achievements')) {
        await whatsappService.sendTextMessage(from, `🏆 *${deptName} - Awards & Achievements*\n\n• Student symposium trophies, hackathon recognitions, and paper presentations.\n• National & state-level award winners.`);
      } else if (action.includes('ind_visit')) {
        await whatsappService.sendTextMessage(from, `🏭 *${deptName} - Industrial Visits & Exposure*\n\n• Regular industrial tours to leading tech companies, ISRO, BSNL, Hyundai, and R&D centers.\n• Real-world industry exposure for all students.`);
      } else if (action.includes('sports')) {
        await whatsappService.sendTextMessage(from, `⚽ *${deptName} - Sports Champions*\n\n• Active student participation and trophies in university athletics and inter-college tournaments.`);
      }
      return whatsappService.sendDepartmentExploreMenu(from, deptName);
    }

    // ── STEP 2 -> STEP 3: Selecting a Department ──
    if (action.startsWith('dept_')) {
      const deptMap = {
        'dept_aids': 'AI & DS',
        'dept_ece': 'ECE',
        'dept_cse': 'CSE',
        'dept_eee': 'EEE',
        'dept_mech': 'Mechanical',
        'dept_mechatronics': 'Mechatronics',
        'dept_it': 'IT'
      };
      const deptName = deptMap[action] || 'Department';
      session.currentState = 'admission_flow';
      session.admissionStep = deptName;
      await session.save();
      return whatsappService.sendDepartmentExploreMenu(from, deptName);
    }

    // Default fallback
    return whatsappService.sendAdmissionWelcome(from);
  }

  async handleParentAction(session, action, from) {
    const student = await Student.findById(session.studentId);
    if (!student) {
      session.currentState = 'initial';
      return whatsappService.sendTextMessage(from, 'Session expired. Please send "hi" to start again.');
    }

    switch (action) {
      case 'principal_circulars': {
        const Circular = require('../models/Circular');
        const circulars = await Circular.find({ status: 'sent', type: 'principal' }).sort({ sentAt: -1 }).limit(1);
        return whatsappService.sendLatestCirculars(from, circulars);
      }

      case 'hod_circulars': {
        const Circular = require('../models/Circular');
        const circulars = await Circular.find({
          status: 'sent',
          type: 'hod',
          department: student.branch // Fetch using student's branch
        }).sort({ sentAt: -1 }).limit(1);
        return whatsappService.sendLatestCirculars(from, circulars);
      }

      case 'marks':
        return whatsappService.sendStudentInfo(from, 'marks', student);

      case 'admission_start':
        session.currentState = 'admission_welcome';
        return whatsappService.sendAdmissionWelcome(from);

      default:
        // Unknown input → re-show parent menu
        return whatsappService.sendParentWelcome(from, student.name);
    }
  }

  // ── Phone-based verification (no manual WhatsApp registration needed) ───────
  async handleVerification(session, regNumber, from) {
    const cleanRegNumber = regNumber.toUpperCase().trim();

    // Step 1: Find student by reg number
    const student = await Student.findOne({ regNumber: cleanRegNumber });

    if (!student) {
      // Reg number not found in DB
      session.currentState = 'initial';
      return whatsappService.sendTextMessage(from,
        `❌ *Registration number not found.*\n\n` +
        `The number *${cleanRegNumber}* is not registered in our system.\n\n` +
        `Please check your registration number or contact your class coordinator.`
      );
    }

    // Step 2: Check if student has a phone number stored
    if (!student.phoneNumber && !student.parentPhoneNumber) {
      // Student exists but no phone stored — admin hasn't added phone yet
      session.currentState = 'initial';
      return whatsappService.sendTextMessage(from,
        `⚠️ *No phone numbers registered.*\n\n` +
        `Please ask your admin to update your (or your parent's) WhatsApp number in the system.\n\n` +
        `Contact your class coordinator for help.`
      );
    }

    // Step 3: Verify phone number matches
    const storedPhone = normalizePhone(student.phoneNumber);
    const storedParentPhone = normalizePhone(student.parentPhoneNumber);
    const senderPhone = normalizePhone(from);

    if (storedPhone !== senderPhone && storedParentPhone !== senderPhone) {
      // Phone doesn't match — possible wrong device or someone trying wrong reg number
      session.currentState = 'initial';
      console.warn(`⚠️ Phone mismatch: Reg=${cleanRegNumber}, Sender=${senderPhone}`);
      return whatsappService.sendTextMessage(from,
        `❌ *Verification failed.*\n\n` +
        `The phone number you are using does not match the registered student or parent number for *${cleanRegNumber}*.\n\n` +
        `Please use the correct WhatsApp number or contact your admin.`
      );
    }

    // ✅ Reg number and phone match!
    session.studentId = student._id;

    if (storedParentPhone === senderPhone && storedPhone !== senderPhone) {
      // It's exclusively a parent number
      session.userType = 'parent';
      session.currentState = 'parent_welcome';
      await whatsappService.sendTextMessage(from, `✅ *Verification Complete!*\n\nWelcome! 👋`);
      return whatsappService.sendParentWelcome(from, student.name);
    } else {
      // It's a student number (or both are the same, we default to student)
      session.currentState = 'awaiting_scholar_type';
      return whatsappService.sendScholarTypeMenu(from);
    }
  }

  async handleScholarType(session, action, from) {
    if (!session.studentId) {
      session.currentState = 'initial';
      return whatsappService.sendTextMessage(from, 'Session expired. Please send "hi" to start again.');
    }

    const student = await Student.findById(session.studentId);
    if (!student) {
      session.currentState = 'initial';
      return whatsappService.sendTextMessage(from, 'Student not found.');
    }

    let scholarType = 'Days Scholar';
    if (action === 'scholar_hostel') scholarType = 'Hostel';
    else if (action === 'scholar_private') scholarType = 'Private';
    else if (action === 'scholar_days') scholarType = 'Days Scholar';
    else {
      // Re-prompt if they send random text
      return whatsappService.sendScholarTypeMenu(from);
    }

    student.scholarType = scholarType;
    student.isRegistered = true;
    await student.save();

    session.userType = 'student';
    session.currentState = 'registered_welcome';

    await whatsappService.sendTextMessage(from, `✅ *Registration Complete!*\n\nWelcome, *${student.name}!* 👋`);
    return whatsappService.sendRegisteredWelcome(from, student);
  }

  async handleAllFoodRatings(session, text, from) {
    if (!text) {
       return whatsappService.sendTextMessage(from, '⚠️ Please provide your ratings in text format.');
    }
    const student = await require('../models/Student').findById(session.studentId);
    
    // Naive parsing: looking for numbers near meal names
    const extractRating = (mealName) => {
       const regex = new RegExp(`${mealName}\\s*:\\s*([0-9]{1,2})`, 'i');
       const match = text.match(regex);
       if (match && match[1]) {
         const score = parseInt(match[1], 10);
         if (score >= 1 && score <= 10) return score;
       }
       return null;
    };

    const breakfast = extractRating('Breakfast');
    const lunch = extractRating('Lunch');
    const snacks = extractRating('Snacks');
    const dinner = extractRating('Dinner');

    if (breakfast === null && lunch === null && snacks === null && dinner === null) {
      return whatsappService.sendTextMessage(from, '❌ We could not understand your ratings. Please use the format:\\nBreakfast: 8\\nLunch: 7\\nSnacks: 9\\nDinner: 6');
    }

    const FoodFeedback = require('../models/FoodFeedback');
    const feedbackData = { studentId: session.studentId };
    
    if (breakfast !== null) feedbackData.breakfastRating = breakfast;
    if (lunch !== null) feedbackData.lunchRating = lunch;
    if (snacks !== null) feedbackData.snacksRating = snacks;
    if (dinner !== null) feedbackData.dinnerRating = dinner;

    await FoodFeedback.create(feedbackData);
    
    session.currentState = 'registered_welcome';
    await session.save();

    await whatsappService.sendTextMessage(from, '✅ Thank you! Your food ratings have been recorded successfully.');
    return whatsappService.sendRegisteredWelcome(from, student);
  }

  // ── Helpdesk / Issue Handlers ───────────────────────────────────────────────
  async handleHelpdeskIssue(session, msgLower, originalText, from) {
    const student = await Student.findById(session.studentId);
    if (!student) {
      session.currentState = 'initial';
      return whatsappService.sendTextMessage(from, 'Session expired. Please send "hi" to start again.');
    }

    if (session.currentState === 'awaiting_issue_category') {
      if (!msgLower.startsWith('issue_')) {
        return whatsappService.sendHelpdeskCategoryMenu(from, student.scholarType);
      }
      
      let category = 'College';
      if (msgLower === 'issue_hostel') category = 'Hostel';
      else if (msgLower === 'issue_bus') category = 'Bus';
      
      session.issueCategory = category;
      session.currentState = 'awaiting_issue_description';
      await session.save();
      
      return whatsappService.sendTextMessage(from, `📝 You selected *${category} Issue*.\n\nPlease type your detailed complaint/issue in a single message. Try to include location (e.g., Room no., Bus Route) if applicable.`);
    }

    if (session.currentState === 'awaiting_issue_description') {
      if (!originalText || originalText.length < 5) {
        return whatsappService.sendTextMessage(from, '⚠️ Please provide a bit more detail about your issue.');
      }
      
      const IssueTicket = require('../models/IssueTicket');
      const ticketId = 'TKT-' + Math.floor(1000 + Math.random() * 9000);
      
      try {
        await IssueTicket.create({
          ticketId,
          studentId: session.studentId,
          category: session.issueCategory,
          description: originalText,
          status: 'Open'
        });
        
        session.currentState = 'registered_welcome';
        session.issueCategory = undefined;
        await session.save();
        
        await whatsappService.sendTextMessage(from, `✅ *Issue Reported!*\n\nYour complaint has been registered successfully.\n🎫 *Ticket ID:* ${ticketId}\n\nOur admin team will look into it shortly.`);
        return whatsappService.sendRegisteredWelcome(from, student);
      } catch (err) {
        console.error('Error saving issue:', err);
        return whatsappService.sendTextMessage(from, '❌ Failed to register issue. Please try again later.');
      }
    }

    if (session.currentState === 'awaiting_outing_details') {
      if (!originalText || originalText.length < 5) {
        return whatsappService.sendTextMessage(from, '⚠️ Please provide a bit more detail about your outing request.');
      }
      
      const Outing = require('../models/Outing');
      const Warden = require('../models/Warden');
      const Student = require('../models/Student');
      
      try {
        let wardenId = session.selectedWardenId;
        let warden = null;
        if (wardenId) {
          warden = await Warden.findById(wardenId);
        }
        if (!warden) {
          warden = await Warden.findOne();
        }
        if (!warden) {
          return whatsappService.sendTextMessage(from, '❌ No wardens available in the system. Cannot process outing.');
        }

        const outing = await Outing.create({
          studentId: session.studentId,
          wardenId: warden._id,
          reason: originalText,
          status: 'Pending'
        });
        
        session.currentState = 'registered_welcome';
        await session.save();
        
        const student = await Student.findById(session.studentId);
        await whatsappService.sendTextMessage(from, `✅ *Outing Request Submitted to Warden ${warden.name}!*\n\nYour request has been sent for approval. You will be notified once it's approved.`);

        if (warden.mobileNumber) {
          await whatsappService.sendOutingApprovalButtons(warden.mobileNumber, outing, student);
        }

        return whatsappService.sendRegisteredWelcome(from, student);
      } catch (err) {
        console.error('Error saving outing:', err);
        return whatsappService.sendTextMessage(from, '❌ Failed to submit outing request. Please try again later.');
      }
    }

    if (session.currentState === 'awaiting_outing_location') {
      return whatsappService.sendLocationRequest(from,
        "⚠️ *Please Share Your Location*\n\nTo verify your return to campus, you must tap the button below and send your *current GPS location*."
      );
    }
  }

  // ── Registered student menu actions ──────────────────────────────────────────
  async handleRegisteredUserAction(session, action, from) {
    const student = await Student.findById(session.studentId);
    if (!student) {
      session.currentState = 'initial';
      session.studentId = null;
      return whatsappService.sendTextMessage(from, 'Session expired. Please send "hi" to start again.');
    }

    if (action.startsWith('select_warden_')) {
      const wardenId = action.replace('select_warden_', '').trim();
      const Warden = require('../models/Warden');
      const selectedWarden = await Warden.findById(wardenId);

      if (!selectedWarden) {
        return whatsappService.sendTextMessage(from, '❌ Selected warden not found. Please try again.');
      }

      session.selectedWardenId = selectedWarden._id;
      session.currentState = 'awaiting_outing_details';
      await session.save();

      return whatsappService.sendTextMessage(from,
        `🚪 *Outing Request to Warden: ${selectedWarden.name} (${selectedWarden.block || 'Hostel'})*\n\n` +
        `Please reply with your outing details in the following format:\n\n` +
        `Reason: [Your reason]\n` +
        `Date & Time: [When you want to leave]`
      );
    }

    switch (action) {
      case 'current_updates': {
        const Circular = require('../models/Circular');
        const circulars = await Circular.find({ status: 'sent' }).sort({ sentAt: -1 }).limit(1);
        await whatsappService.sendLatestCirculars(from, circulars);
        return whatsappService.sendMainMenuButton(from);
      }

      case 'academics':
        return whatsappService.sendAcademicsMenu(from);

      case 'marks':
        await whatsappService.sendStudentInfo(from, 'marks', student);
        return whatsappService.sendMainMenuButton(from);

      case 'attendance':
        await whatsappService.sendStudentInfo(from, 'attendance', student);
        return whatsappService.sendMainMenuButton(from);

      case 'timetable':
        await whatsappService.sendTimetable(from, student);
        return whatsappService.sendMainMenuButton(from);

      case 'hostel_services':
        return whatsappService.sendHostelMenu(from);

      case 'make_outing': {
        const Outing = require('../models/Outing');
        const existingOuting = await Outing.findOne({
          studentId: session.studentId,
          status: { $in: ['Pending', 'Approved', 'Out'] }
        });
        if (existingOuting) {
          return whatsappService.sendTextMessage(from,
            `⚠️ *Active Outing Permit Exists*\n\n` +
            `You already have an outing pass with status: *${existingOuting.status}*.\n` +
            `You cannot request a new outing permit until your current outing is completed or returned.`
          );
        }
        const Warden = require('../models/Warden');
        const wardens = await Warden.find({});
        if (!wardens || wardens.length === 0) {
          return whatsappService.sendTextMessage(from, '❌ No wardens available in the system. Cannot process outing.');
        }
        if (wardens.length === 1) {
          session.selectedWardenId = wardens[0]._id;
          session.currentState = 'awaiting_outing_details';
          await session.save();
          return whatsappService.sendTextMessage(from, `🚪 *Outing Request to Warden: ${wardens[0].name}*\n\nPlease reply with your outing details in the following format:\n\nReason: [Your reason]\nDate & Time: [When you want to leave]`);
        }
        session.currentState = 'selecting_outing_warden';
        await session.save();
        return whatsappService.sendWardenSelectionMenu(from, wardens);
      }

      case 'return_outing': {
        const Outing = require('../models/Outing');
        const activeOuting = await Outing.findOne({
          studentId: session.studentId,
          status: 'Out'
        });

        if (!activeOuting) {
          return whatsappService.sendTextMessage(from,
            "❌ *Not Eligible for Outing Return*\n\n" +
            "You do not have an active approved outing permit. Only students who have received warden approval and left campus can use the Outing Return check-in."
          );
        }

        session.currentState = 'awaiting_outing_location';
        await session.save();
        return whatsappService.sendLocationRequest(from,
          "📍 *Outing Check-In (Return to Campus)*\n\nTo automatically record your return to campus, please tap the button below and share your *current location*.\n\n_Note: You must be within a 1 km radius of Velammal Institute of Technology campus._"
        );
      }

      case 'rate_food':
        session.currentState = 'awaiting_food_ratings';
        await session.save();
        return whatsappService.sendTextMessage(from, `🍽️ *Rate Today's Meals*\n\nPlease reply with a single message containing your ratings (1 to 10) for all meals like this:\n\nBreakfast: 8\nLunch: 7\nSnacks: 9\nDinner: 6`);

      case 'transportation':
        await whatsappService.sendStudentInfo(from, 'transportation', student);
        return whatsappService.sendMainMenuButton(from);

      case 'fee_balance':
        return whatsappService.sendFeeMenu(from);

      case 'fee_check':
        await whatsappService.sendStudentInfo(from, 'fee_check', student);
        return whatsappService.sendMainMenuButton(from);

      case 'fee_payment':
        return whatsappService.sendStudentInfo(from, 'fee_payment', student);

      case 'helpdesk':
        session.currentState = 'awaiting_issue_category';
        await session.save();
        return whatsappService.sendHelpdeskCategoryMenu(from, student.scholarType);

      case 'admission_start':
        session.currentState = 'admission_welcome';
        await session.save();
        return whatsappService.sendAdmissionWelcome(from);

      case 'check_bus': {
        const trans = student.transportation;
        if (trans && (trans.busName || trans.boardingPoint)) {
          await whatsappService.sendTextMessage(from, `🚌 *Your Boarding Details*\n\n*Bus Name:* ${trans.busName || 'Not assigned'}\n*Boarding Point:* ${trans.boardingPoint || 'Not assigned'}\n*Time:* ${trans.time || 'Not assigned'}`);
        } else {
          await whatsappService.sendTextMessage(from, `🚌 *Boarding Details Not Found*\n\nWe couldn't find your specific bus allocation in the master list. Please contact your admin if this is a mistake.`);
        }
        return whatsappService.sendMainMenuButton(from);
      }

      default:
        // Check for dynamic buttons like 'seating_12345...'
        if (action.startsWith('seating_')) {
          const timetableId = action.split('_')[1];
          const Timetable = require('../models/Timetable');
          
          try {
            const timetable = await Timetable.findById(timetableId);
            if (timetable && timetable.seatingDetails) {
              const mySeating = timetable.seatingDetails.find(
                s => String(s.regNumber).trim().toUpperCase() === String(student.regNumber).trim().toUpperCase()
              );
              
              if (mySeating) {
                const roomText = mySeating.room ? `Room: ${mySeating.room}` : '';
                const seatText = mySeating.seat ? `Seat: ${mySeating.seat}` : '';
                const detailText = [roomText, seatText].filter(Boolean).join('\n');
                
                return whatsappService.sendTextMessage(from, `🪑 *Your Seating Details*\n\n${detailText || 'Details pending.'}`);
              } else {
                return whatsappService.sendTextMessage(from, `🪑 *Seating Details Not Found*\n\nWe couldn't find your seating allocation for this exam. Please contact your admin.`);
              }
            }
          } catch (err) {
            console.error('Error fetching seating details:', err);
          }
        }

        // Unknown input → re-show menu
        return whatsappService.sendRegisteredWelcome(from, student);
    }
  }

  // ── Staff Actions ────────────────────────────────────────────────────────
  async handleStaffAction(session, messageText, from) {
    const Staff = require('../models/Staff');
    const staff = await Staff.findById(session.staffId);
    if (!staff) return;

    const actionLower = typeof messageText === 'string' ? messageText.toLowerCase() : '';

    switch (actionLower) {
      case 'staff_complaint':
        session.currentState = 'staff_awaiting_complaint';
        await session.save();
        return whatsappService.sendTextMessage(from, '⚠️ *Report an Issue*\n\nPlease type a short description of the issue.');

      case 'staff_admission':
        return whatsappService.sendTextMessage(from, `📋 *Admission Application*\n\nHere is the link to the admission form:\n${process.env.FRONTEND_URL || 'http://localhost:3000'}/apply`);

      default:
        // Handle awaiting complaint
        if (session.currentState === 'staff_awaiting_complaint') {
          if (messageText) {
            const StaffIssue = require('../models/StaffIssue');
            const ticketId = 'TKT-STAFF-' + Math.floor(1000 + Math.random() * 9000);
            
            await StaffIssue.create({
              ticketId,
              staffId: session.staffId,
              description: messageText,
              status: 'Open'
            });

            session.currentState = 'staff_welcome';
            await session.save();
            await whatsappService.sendTextMessage(from, `✅ *Complaint Registered*\n\nTicket ID: ${ticketId}\nYour issue has been forwarded to the Principal's Dashboard.`);
            return whatsappService.sendStaffWelcome(from, staff.name);
          }
        }

        return whatsappService.sendStaffWelcome(from, staff.name);
    }
  }

  // ── Warden Actions ────────────────────────────────────────────────────────
  async handleWardenAction(session, messageText, from) {
    const Warden = require('../models/Warden');
    const warden = await Warden.findById(session.wardenId);
    if (!warden) return;

    const actionLower = typeof messageText === 'string' ? messageText.toLowerCase() : '';

    switch (actionLower) {
      case 'warden_outing':
        return whatsappService.sendTextMessage(from, '🚪 *Outings*\n\nPlease reply with:\n1. *NEW* - to view pending requests\n2. *RET [RegNo] [OTP]* - to mark a student returned (e.g. RET VCET-2026-00004 4829)');
      
      case '1':
      case 'new':
      case 'pending':
      case 'warden_pending_outings': {
        const Outing = require('../models/Outing');
        const pendingOutings = await Outing.find({
          status: 'Pending',
          $or: [{ wardenId: session.wardenId }, { wardenId: { $exists: false } }]
        }).populate('studentId').sort({ requestTime: -1 }).limit(10);

        if (!pendingOutings || pendingOutings.length === 0) {
          return whatsappService.sendTextMessage(from, '🚪 *Pending Outing Requests*\n\n✅ There are currently no pending outing requests.');
        }

        await whatsappService.sendTextMessage(from, `🚪 *Pending Outing Requests (${pendingOutings.length})*\n\n_Tap ✅ Approve or ❌ Reject on each request card below:_`);

        for (const out of pendingOutings.slice(0, 5)) {
          await whatsappService.sendOutingApprovalButtons(from, out, out.studentId || {});
        }
        return;
      }

      case 'warden_complaint':
        session.currentState = 'warden_awaiting_complaint';
        await session.save();
        return whatsappService.sendTextMessage(from, '⚠️ *Report an Issue*\n\nPlease type a short description of the issue or send a photo.');

      case 'warden_admission':
        return whatsappService.sendTextMessage(from, `📋 *Admission Application*\n\nHere is the link to the admission form:\n${process.env.FRONTEND_URL || 'http://localhost:3000'}/apply`);

      default:
        // Handle awaiting complaint
        if (session.currentState === 'warden_awaiting_complaint') {
          // Here we would handle text or photo. For now, text:
          if (messageText) {
            const WardenIssue = require('../models/WardenIssue');
            const ticketId = 'TKT-WARD-' + Math.floor(1000 + Math.random() * 9000);
            
            await WardenIssue.create({
              ticketId,
              wardenId: session.wardenId,
              description: messageText,
              status: 'Open'
            });

            session.currentState = 'warden_welcome';
            await session.save();
            await whatsappService.sendTextMessage(from, `✅ *Complaint Registered*\n\nTicket ID: ${ticketId}\nYour issue has been forwarded to the Principal's Dashboard.`);
            return whatsappService.sendWardenWelcome(from, warden.name, warden.block);
          }
        }

        // Handle APP (Approve Outing): APP [RegNo] via Interactive Button or text
        if (actionLower.startsWith('app ')) {
          const queryParam = actionLower.replace('app ', '').trim();
          const Outing = require('../models/Outing');
          const Student = require('../models/Student');
          const ChatSession = require('../models/ChatSession');

          let outing = null;
          const student = await Student.findOne({ regNumber: { $regex: new RegExp(`^${queryParam}$`, 'i') } });
          if (student) {
            outing = await Outing.findOne({ studentId: student._id, status: 'Pending' }).sort({ requestTime: -1 }).populate('studentId');
          } else {
            outing = await Outing.findById(queryParam).populate('studentId').catch(() => null);
          }

          if (!outing) {
            return whatsappService.sendTextMessage(from, `❌ Could not find a pending outing request matching Reg No "${queryParam}". Please tap the ✅ Approve button on the request card.`);
          }

          outing.status = 'Approved';
          outing.returnOTP = Math.floor(1000 + Math.random() * 9000).toString();
          const stu = outing.studentId || {};
          outing.qrToken = `VCET-OUT-${outing._id}-${stu.regNumber || 'N/A'}`;
          await outing.save();

          await whatsappService.sendTextMessage(from,
            `✅ *Outing Approved!*\n\n` +
            `👤 *Student:* ${stu.name || 'Student'} (${stu.regNumber || 'N/A'})\n` +
            `🔑 *Return OTP:* ${outing.returnOTP}\n\n` +
            `The student has been sent their Digital Outing Pass QR Code on WhatsApp automatically.`
          );

          const studentSession = await ChatSession.findOne({ studentId: stu._id });
          const studentPhone = studentSession ? studentSession.phoneNumber : (stu.phoneNumber || stu.mobileNumber);
          if (studentPhone) {
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(outing.qrToken)}`;
            
            await whatsappService.sendImageMessage(studentPhone, qrImageUrl,
              `🛡️ *VELAMMAL DIGITAL OUTING PASS*\n\n` +
              `👤 *Student:* ${stu.name || 'Student'} (${stu.regNumber || 'N/A'})\n` +
              `📄 *Reason:* ${outing.reason}\n` +
              `🔑 *OTP:* ${outing.returnOTP}\n\n` +
              `_Show this QR Code to security guards at Gate 1 (Hostel) & Gate 2 (Main Campus Gate) for check-out and check-in._`
            );

            await whatsappService.sendTextMessage(studentPhone,
              `✅ *Your Outing Request is APPROVED!*\n\n` +
              `Show the QR Code above to security guards at Gate 1 (Hostel) & Gate 2 (Main College Gate).\n\n` +
              `_When returning to campus, scan your QR Code at the gates AND/OR tap "📍 Outing Return" in your Hostel Menu to check in via location!_`
            );
          }
          return;
        }

        // Handle REJ (Reject Outing): REJ [RegNo] via Interactive Button or text
        if (actionLower.startsWith('rej ')) {
          const queryParam = actionLower.replace('rej ', '').trim();
          const Outing = require('../models/Outing');
          const Student = require('../models/Student');
          const ChatSession = require('../models/ChatSession');

          let outing = null;
          const student = await Student.findOne({ regNumber: { $regex: new RegExp(`^${queryParam}$`, 'i') } });
          if (student) {
            outing = await Outing.findOne({ studentId: student._id, status: 'Pending' }).sort({ requestTime: -1 }).populate('studentId');
          } else {
            outing = await Outing.findById(queryParam).populate('studentId').catch(() => null);
          }

          if (!outing) {
            return whatsappService.sendTextMessage(from, `❌ Could not find a pending outing request matching Reg No "${queryParam}". Please tap the ❌ Reject button on the request card.`);
          }

          outing.status = 'Rejected';
          await outing.save();

          const stu = outing.studentId || {};
          await whatsappService.sendTextMessage(from, `❌ *Outing Rejected* for ${stu.name || 'Student'} (${stu.regNumber || 'N/A'}).`);

          const studentSession = await ChatSession.findOne({ studentId: stu._id });
          const studentPhone = studentSession ? studentSession.phoneNumber : (stu.phoneNumber || stu.mobileNumber);
          if (studentPhone) {
            await whatsappService.sendTextMessage(studentPhone,
              `❌ *Your Outing Request was REJECTED by the Warden.*\n\n📄 *Reason:* ${outing.reason}\n\n_Please contact your hostel warden for further details._`
            );
          }
          return;
        }

        // Handle RET command: RET [RegNo] [OTP]
        if (actionLower.startsWith('ret ')) {
          const parts = actionLower.split(/\s+/);
          if (parts.length < 3) {
            return whatsappService.sendTextMessage(from, '⚠️ *Invalid Format*\n\nUsage: *RET [RegNo] [OTP]*\nExample: `RET VCET-2026-00004 4829`');
          }
          const regNo = parts[1].trim();
          const otp = parts[2].trim();

          const Student = require('../models/Student');
          const Outing = require('../models/Outing');

          const student = await Student.findOne({ regNumber: { $regex: new RegExp(`^${regNo}$`, 'i') } });
          if (!student) {
            return whatsappService.sendTextMessage(from, `❌ Student with RegNo "${regNo}" not found.`);
          }

          const outing = await Outing.findOne({
            studentId: student._id,
            status: 'Out',
            returnOTP: otp
          });

          if (!outing) {
            return whatsappService.sendTextMessage(from, `❌ No active outing found for "${regNo}" with OTP "${otp}".`);
          }

          outing.status = 'Returned';
          outing.actualReturnTime = new Date();
          await outing.save();

          return whatsappService.sendTextMessage(from, `✅ *Outing Return Marked!*\n\nStudent *${student.name}* (${student.regNumber}) has been checked back into the hostel.`);
        }

        return whatsappService.sendWardenWelcome(from, warden.name, warden.block);
    }
  }

  async handleSecurityGuardAction(session, messageText, from, rawMessage = null) {
    const actionLower = (messageText || '').toLowerCase().trim();
    const SecurityGuard = require('../models/SecurityGuard');
    const Outing = require('../models/Outing');
    const guard = await SecurityGuard.findById(session.securityId);
    const guardName = guard ? guard.name : 'Security Guard';
    const gateName = session.activeGate || (guard ? guard.gateAssigned : 'Gate 1 (Hostel Gate)');

    // ── 1) GATE SELECTION: Save gate choice until "Hi" is sent again ──
    if (actionLower === 'select_gate_1') {
      session.activeGate = 'Gate 1 (Hostel Gate)';
      await session.save();
      if (guard) {
        guard.gateAssigned = 'Gate 1 (Hostel Gate)';
        await guard.save();
      }
      return whatsappService.sendTextMessage(from,
        `✅ *Active Post Saved:* 🏢 Gate 1 (Hostel Gate)\n\n` +
        `Your shift location is saved until you send 'Hi' again to change it.\n\n` +
        `👉 *How to Scan & Record Outing Passes in WhatsApp:*\n` +
        `1️⃣ *Send a Photo 📷* of the student's QR Code here\n` +
        `2️⃣ Or *Type/Paste* their Registration Number (e.g. 113323106071) or QR token\n` +
        `3️⃣ Or tap *🔗 Open Web Scanner* in the menu.`
      );
    }

    if (actionLower === 'select_gate_2') {
      session.activeGate = 'Gate 2 (Main Gate)';
      await session.save();
      if (guard) {
        guard.gateAssigned = 'Gate 2 (Main Gate)';
        await guard.save();
      }
      return whatsappService.sendTextMessage(from,
        `✅ *Active Post Saved:* 🏛️ Gate 2 (Main Gate)\n\n` +
        `Your shift location is saved until you send 'Hi' again to change it.\n\n` +
        `👉 *How to Scan & Record Outing Passes in WhatsApp:*\n` +
        `1️⃣ *Send a Photo 📷* of the student's QR Code here\n` +
        `2️⃣ Or *Type/Paste* their Registration Number (e.g. 113323106071) or QR token\n` +
        `3️⃣ Or tap *🔗 Open Web Scanner* in the menu.`
      );
    }

    // ── 2) QR CODE IMAGE UPLOAD in WhatsApp ──
    if (rawMessage && rawMessage.type === 'image') {
      const mediaId = rawMessage.image?.id;
      if (!mediaId) {
        return whatsappService.sendTextMessage(from, `⚠️ Could not receive image. Please try again or type the student's Registration Number.`);
      }
      await whatsappService.sendTextMessage(from, `⏳ *Scanning QR Code Photo...*`);
      const imgBuffer = await whatsappService.downloadMedia(mediaId);
      if (!imgBuffer) {
        return whatsappService.sendTextMessage(from, `❌ Could not download image from WhatsApp. Please type the Registration Number directly.`);
      }
      try {
        const Jimp = require('jimp');
        const jsQR = require('jsqr');
        const image = await Jimp.read(imgBuffer);
        const imageData = {
          data: new Uint8ClampedArray(image.bitmap.data),
          width: image.bitmap.width,
          height: image.bitmap.height
        };
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          return this.processGuardStudentScan(session, code.data, from, gateName);
        } else {
          return whatsappService.sendTextMessage(from,
            `⚠️ *QR Code Blurry or Glare Detected*\n\n` +
            `We could not read the barcode from this photo. Please try:\n` +
            `1️⃣ *🔗 Use Live Web Scanner* from your menu\n` +
            `2️⃣ Or *Type the Student's Reg No* (e.g. 113323106071) directly in this chat.`
          );
        }
      } catch (err) {
        console.error('Error decoding QR image:', err);
        return whatsappService.sendTextMessage(from,
          `⚠️ *Could Not Process Image*\n\n` +
          `Please try:\n` +
          `1️⃣ *🔗 Use Live Web Scanner* from your menu\n` +
          `2️⃣ Or *Type the Student's Reg No* directly in this chat.`
        );
      }
    }

    // ── 3) STUDENT REGISTRATION NUMBER OR QR TOKEN TEXT ──
    const regMatch = actionLower.match(/^(vcet-out-|\d{8,15})/i);
    if (regMatch) {
      return this.processGuardStudentScan(session, messageText.trim(), from, gateName);
    }

    // ── 4) STANDARD MENU ACTIONS ──
    if (actionLower === 'security_open_scanner' || actionLower === '1' || actionLower === 'scan' || actionLower === 'scanner') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return whatsappService.sendTextMessage(from,
        `🛡️ *Velammal Gate QR Scanner (${gateName})*\n\n` +
        `Open the security guard QR scanner below on your mobile or tablet to scan student Outing Passes:\n` +
        `🔗 ${frontendUrl}/guard-scanner`
      );
    }

    if (actionLower === 'security_gate_logs' || actionLower === '2' || actionLower === 'logs') {
      const outCount = await Outing.countDocuments({ status: 'Out' });
      const returnedCount = await Outing.countDocuments({ status: 'Returned' });
      return whatsappService.sendTextMessage(from,
        `📋 *Today's Campus Gate Summary*\n\n` +
        `🚪 *Students Currently OUT:* ${outCount}\n` +
        `🔙 *Students Returned Today:* ${returnedCount}\n\n` +
        `_Your Active Post:_ *${gateName}*`
      );
    }

    if (actionLower === 'security_report_issue' || actionLower === '3' || actionLower === 'report') {
      return whatsappService.sendTextMessage(from,
        `🚨 *Gate Emergency / Issue Alert*\n\n` +
        `Please reply with a description of the emergency or gate issue. It will be logged for the Hostel Wardens & Admin.`
      );
    }

    return whatsappService.sendSecurityGuardWelcome(from, guardName, gateName);
  }

  async processGuardStudentScan(session, scanText, from, gateName) {
    const Student = require('../models/Student');
    const Outing = require('../models/Outing');
    let regNum = scanText.trim();

    if (regNum.toUpperCase().startsWith('VCET-OUT-')) {
      const parts = regNum.split('-');
      if (parts.length >= 3) regNum = parts[2];
    }

    const student = await Student.findOne({ $or: [{ regNumber: regNum }, { regNum: regNum }] });
    if (!student) {
      return whatsappService.sendTextMessage(from, `❌ *Student Not Found*\nNo student registered with Registration Number: *${regNum}*`);
    }

    const outing = await Outing.findOne({
      studentId: student._id,
      status: { $in: ['Approved', 'Pending', 'Out'] }
    }).sort({ requestTime: -1 }).populate('wardenId');

    if (!outing) {
      return whatsappService.sendTextMessage(from,
        `⚠️ *No Active Outing Request*\n` +
        `Student *${student.name}* (${student.regNumber || regNum}) does not have an approved or active Outing Pass.`
      );
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    const dateFormatted = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

    const parentPhone = student.parentPhoneNumber || student.parentPhone || student.parentContact;
    const studentPhone = student.phoneNumber || student.mobileNumber;
    const wardenPhone = outing.wardenId ? (outing.wardenId.mobileNumber || outing.wardenId.phone) : null;

    // Exit Check
    if (outing.status === 'Approved' || outing.status === 'Pending') {
      outing.status = 'Out';
      outing.actualOutTime = now;
      if (gateName.includes('1')) outing.gate1ExitTime = now;
      if (gateName.includes('2')) outing.gate2ExitTime = now;
      await outing.save();

      if (parentPhone) {
        whatsappService.sendTextMessage(normalizePhone(parentPhone),
          `🔔 *Velammal Gate Alert:* Student *${student.name}* has exited campus via *${gateName}* on ${dateFormatted} at ${timeFormatted}.`
        ).catch(e => console.error('Parent exit alert failed:', e.message));
      }
      if (studentPhone) {
        whatsappService.sendTextMessage(normalizePhone(studentPhone),
          `🔔 *Campus Exit Logged:* You have checked out via *${gateName}* at ${timeFormatted}. Have a safe outing!`
        ).catch(e => console.error('Student exit alert failed:', e.message));
      }
      if (wardenPhone) {
        whatsappService.sendTextMessage(normalizePhone(wardenPhone),
          `🔔 *Warden Alert:* Student *${student.name}* (${student.regNumber || regNum}) exited campus via *${gateName}* at ${timeFormatted}.`
        ).catch(e => console.error('Warden exit alert failed:', e.message));
      }

      return whatsappService.sendTextMessage(from,
        `✅ *OUTING EXIT APPROVED*\n\n` +
        `🧑 *Student:* ${student.name} (${student.regNumber || regNum})\n` +
        `🏢 *Gate:* ${gateName}\n` +
        `🕒 *Time:* ${timeFormatted}\n\n` +
        `_Student is checked out of campus._`
      );
    }

    // Return Check
    if (outing.status === 'Out') {
      outing.status = 'Returned';
      outing.actualReturnTime = now;
      if (gateName.includes('1')) outing.gate1ReturnTime = now;
      if (gateName.includes('2')) outing.gate2ReturnTime = now;
      await outing.save();

      if (parentPhone) {
        whatsappService.sendTextMessage(normalizePhone(parentPhone),
          `🔔 *Velammal Gate Alert:* Student *${student.name}* has returned to campus via *${gateName}* on ${dateFormatted} at ${timeFormatted}.`
        ).catch(e => console.error('Parent return alert failed:', e.message));
      }
      if (studentPhone) {
        whatsappService.sendTextMessage(normalizePhone(studentPhone),
          `🔔 *Campus Return Logged:* Welcome back! Your return via *${gateName}* has been logged at ${timeFormatted}.`
        ).catch(e => console.error('Student return alert failed:', e.message));
      }
      if (wardenPhone) {
        whatsappService.sendTextMessage(normalizePhone(wardenPhone),
          `🔔 *Warden Alert:* Student *${student.name}* (${student.regNumber || regNum}) returned to campus via *${gateName}* at ${timeFormatted}.`
        ).catch(e => console.error('Warden return alert failed:', e.message));
      }

      return whatsappService.sendTextMessage(from,
        `✅ *CAMPUS RETURN LOGGED*\n\n` +
        `🧑 *Student:* ${student.name} (${student.regNumber || regNum})\n` +
        `🏢 *Gate:* ${gateName}\n` +
        `🕒 *Time:* ${timeFormatted}\n\n` +
        `_Student has returned safely to campus._`
      );
    }
  }

  async handleDriverAction(session, messageText, from) {
    const actionLower = (messageText || '').toLowerCase().trim();
    const Driver = require('../models/Driver');
    const driver = await Driver.findById(session.driverId);
    const driverName = driver ? driver.name : 'Driver';
    const busNo = driver ? driver.busNumber : 'N/A';
    const routeNo = driver ? driver.routeNumber : 'N/A';

    if (actionLower === 'driver_start_trip' || actionLower === '1' || actionLower === 'gps' || actionLower === 'location') {
      return whatsappService.sendTextMessage(from,
        `📍 *Start Bus Trip & GPS Broadcast*\n\n` +
        `Please use the WhatsApp attachment icon (📎) ➔ *Location* ➔ *Share Live Location* to broadcast live bus GPS to parents on *Route ${routeNo}*!`
      );
    }

    if (actionLower === 'driver_route_info' || actionLower === '2' || actionLower === 'route' || actionLower === 'info') {
      return whatsappService.sendTextMessage(from,
        `🚌 *Bus & Route Information*\n\n` +
        `🧑‍✈️ *Driver:* ${driverName}\n` +
        `🚐 *Bus Number:* ${busNo}\n` +
        `🗺️ *Route:* ${routeNo}\n` +
        `🟢 *Status:* Active & On-Schedule`
      );
    }

    if (actionLower === 'driver_report_issue' || actionLower === '3' || actionLower === 'issue') {
      return whatsappService.sendTextMessage(from,
        `⚠️ *Report Bus Delay / Issue*\n\n` +
        `Please reply with the reason for delay or maintenance issue. It will be sent to the Transport Coordinator.`
      );
    }

    return whatsappService.sendDriverWelcome(from, driverName, busNo, routeNo);
  }
}

module.exports = new ChatService();
