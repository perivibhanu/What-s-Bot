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

const activeTimeouts = new Map();

class ChatService {
  async handleIncomingMessage(from, message) {
    let session = await ChatSession.findOne({ phoneNumber: from });

    if (activeTimeouts.has(from)) {
      clearTimeout(activeTimeouts.get(from));
      activeTimeouts.delete(from);
    }

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

      // ⏳ Check session expiry (5 minutes)
      const sessionTimeoutMs = 5 * 60 * 1000;
      if (now - last > sessionTimeoutMs) {
        console.log(`⏳ Session expired for ${from}. Resetting state.`);
        if (session.studentId) {
          session.currentState = 'registered_welcome';
          session.userType = 'student';
        } else if (session.userType === 'staff' && session.staffId) {
          session.currentState = 'staff_welcome';
        } else {
          session.currentState = 'initial';
          session.tempRegNumber = undefined;
          session.userType = 'visitor';
          session.studentId = undefined;
          session.staffId = undefined;
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
    }

    await this.processMessage(session, messageText, from);
    await session.save();

    if (session.currentState !== 'initial') {
      const timeoutId = setTimeout(async () => {
        try {
          const currentSession = await ChatSession.findOne({ phoneNumber: from });
          // Check if exactly 45s has passed without new interaction
          if (currentSession && (Date.now() - currentSession.lastInteraction >= 44000)) {
            currentSession.currentState = 'initial';
            currentSession.tempRegNumber = undefined;
            await currentSession.save();

            const whatsappService = require('./whatsappService');
            await whatsappService.sendTextMessage(from, "It seems you've been inactive. Please clear this chat for safety.\n\nTo continue, please type 'Hi' to access the main menu");
          }
        } catch (err) {
          console.error('Error in inactivity timeout:', err);
        }
      }, 45000);
      activeTimeouts.set(from, timeoutId);
    }
  }

  async processMessage(session, messageText, from) {
    const msgLower = messageText.toLowerCase();
    const isGreeting = ['hi', 'hello', 'hey', 'start', 'hii', 'hai', 'back', 'menu', 'main menu'].includes(msgLower);

    // ── Auto-detect staff or warden member ──────────────────────────────────────────────
    if (isGreeting && session.userType !== 'staff' && session.userType !== 'warden') {
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
      return this.handleWardenAction(session, messageText, from); // Pass raw messageText because images might not have text
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
        // Any message (greeting or otherwise) → show 2-button welcome
        session.currentState = 'visitor_welcome';
        return whatsappService.sendInitialWelcome(from);

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
          if (session.currentTopic && session.currentTopic.startsWith('dept_')) {
             const parts = session.currentTopic.split('_');
             if (parts.length === 2) {
               return whatsappService.sendDeptMoreOptionsMenu(from, parts[1].toUpperCase(), session.currentTopic);
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
          return whatsappService.sendInitialWelcome(from);
        }
        // Unknown → re-show welcome
        return whatsappService.sendInitialWelcome(from);

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
          return whatsappService.sendInitialWelcome(from);
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
        session.currentState = 'visitor_welcome';
        session.admissionStep = '';
        session.admissionData = {};
        await whatsappService.sendAdmissionWelcome(from);
        return;

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
        let warden = await Warden.findOne();
        if (!warden) {
          return whatsappService.sendTextMessage(from, '❌ No wardens available in the system. Cannot process outing.');
        }

        await Outing.create({
          studentId: session.studentId,
          wardenId: warden._id,
          reason: originalText,
          status: 'Pending'
        });
        
        session.currentState = 'registered_welcome';
        await session.save();
        
        await whatsappService.sendTextMessage(from, `✅ *Outing Request Submitted!*\n\nYour request has been sent to the warden for approval.\nYou will be notified once it's approved.`);
        const student = await Student.findById(session.studentId);
        return whatsappService.sendRegisteredWelcome(from, student);
      } catch (err) {
        console.error('Error saving outing:', err);
        return whatsappService.sendTextMessage(from, '❌ Failed to submit outing request. Please try again later.');
      }
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

      case 'make_outing':
        session.currentState = 'awaiting_outing_details';
        await session.save();
        return whatsappService.sendTextMessage(from, '🚪 *Outing Request*\n\nPlease reply with your outing details in the following format:\n\nReason: [Your reason]\nDate & Time: [When you want to leave]');

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

        // Handle RET command
        if (actionLower.startsWith('ret ')) {
          // To be implemented in the Outing flow
          return whatsappService.sendTextMessage(from, 'Outing return feature under development.');
        }

        return whatsappService.sendWardenWelcome(from, warden.name, warden.block);
    }
  }
}

module.exports = new ChatService();
