const axios = require('axios');

const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`;

class WhatsAppService {
  async sendMessage(to, message) {
    try {
      console.log('Sending WhatsApp message to:', to);
      console.log('Message payload:', JSON.stringify(message, null, 2));
      
      const response = await axios.post(WHATSAPP_API_URL, {
        ...message,
        to: to
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('WhatsApp API Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('WhatsApp API Error Details:');
      console.error('Status:', error.response?.status);
      console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Message:', error.message);
      throw error;
    }
  }

  async sendWelcomeMessage(to, imageUrl) {
    const message = {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: 'Welcome to Velammal Institute of Technology! 🎓\n\nHow can we help you today?'
        },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'register', title: 'Register' } },
            { type: 'reply', reply: { id: 'about', title: 'About' } },
            { type: 'reply', reply: { id: 'contact', title: 'Contact' } }
          ]
        }
      }
    };

    if (imageUrl) {
      message.interactive.header = {
        type: 'image',
        image: { link: imageUrl }
      };
    }

    return this.sendMessage(to, message);
  }

  async sendImageMessage(to, imageUrl, caption) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'image',
      image: {
        link: imageUrl,
        caption: caption
      }
    });
  }

  async sendOutingApprovalButtons(to, outing, student) {
    const timeStr = outing.requestTime ? new Date(outing.requestTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
    const regNo = student?.regNumber || student?.registrationNumber || 'N/A';
    const message = {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `🚪 *Pending Outing Request*\n\n` +
                `👤 *Student:* ${student?.name || 'Student'}\n` +
                `🆔 *Reg No:* ${regNo}\n` +
                `📄 *Reason:* ${outing.reason}\n` +
                `🕒 *Requested:* ${timeStr}\n` +
                `🔑 *Request ID:* \`${outing._id}\``
        },
        action: {
          buttons: [
            { type: 'reply', reply: { id: `APP ${regNo}`, title: '✅ Approve' } },
            { type: 'reply', reply: { id: `REJ ${regNo}`, title: '❌ Reject' } }
          ]
        }
      }
    };
    return this.sendMessage(to, message);
  }

  async sendRegisteredWelcome(to, student) {
    const welcomeText = student?.name 
      ? `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nHello ${student.name}, please choose your preferred student service below:`
      : `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nPlease choose your preferred student service below:`;
    
    const rows = [
      { id: 'current_updates', title: '📢 Current Updates', description: 'Principal & college circulars' },
      { id: 'marks', title: '📊 Marks & Results', description: 'View semester marks & grades' },
      { id: 'attendance', title: '📋 Attendance Report', description: 'Check current attendance %' },
      { id: 'timetable', title: '📅 Class Timetable', description: 'View daily lecture schedule' }
    ];

    if (student?.scholarType === 'Hostel') {
      rows.push(
        { id: 'make_outing', title: '🎟️ Outing Permit', description: 'Request new outing permit' },
        { id: 'return_outing', title: '📍 Outing Check-in', description: 'Share location for check-in' },
        { id: 'rate_food', title: '⭐ Rate Hostel Food', description: 'Rate hostel meals & dining' }
      );
    } else {
      rows.push({ id: 'transportation', title: '🚌 Transport Routes', description: 'College bus routes & numbers' });
    }

    rows.push(
      { id: 'fee_balance', title: '💳 Fee Balance', description: 'Check due fees & payment' },
      { id: 'helpdesk', title: '🛠️ Helpdesk Support', description: 'Report issues & complaints' },
      { id: 'admission_start', title: '🎓 Sibling Admission', description: 'Apply for siblings & cousins' }
    );

    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: welcomeText
        },
        action: {
          button: 'Choose Service',
          sections: [{
            title: 'Select One Service',
            rows: rows
          }]
        }
      }
    });
  }

  async sendHostelMenu(to) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: '🏨 *Hostel Services*\n\nSelect an option below to manage outings or food ratings:'
        },
        action: {
          button: 'Select Option',
          sections: [{
            title: 'Hostel Options',
            rows: [
              { id: 'make_outing', title: '🚪 Make Outing', description: 'Request a new outing permit' },
              { id: 'return_outing', title: '📍 Outing Return', description: 'Share location to mark campus check-in' },
              { id: 'rate_food', title: '🍽️ Rate Food', description: 'Rate breakfast, lunch, snacks, dinner' },
              { id: 'main_menu', title: '🔙 Main Menu', description: 'Return to main dashboard' }
            ]
          }]
        }
      }
    });
  }

  async sendLocationRequest(to, text) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'location_request_message',
        body: {
          text: text
        },
        action: {
          name: 'send_location'
        }
      }
    });
  }

  async sendWardenSelectionMenu(to, wardens) {
    const rows = wardens.map(w => ({
      id: `select_warden_${w._id}`,
      title: (w.name || 'Warden').substring(0, 24),
      description: `Block: ${w.block || 'Hostel'}`.substring(0, 72)
    }));

    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: '🏢 *Select Your Hostel Warden*\n\nPlease choose your block/hostel warden to send your outing request to:'
        },
        action: {
          button: 'Select Warden',
          sections: [{
            title: 'Hostel Wardens',
            rows: rows
          }]
        }
      }
    });
  }

  async sendMealSelectionMenu(to) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: '🍽️ Which meal would you like to rate?' },
        action: {
          button: 'Select Meal',
          sections: [{
            title: 'Meals',
            rows: [
              { id: 'rate_meal_breakfast', title: '🥞 Breakfast' },
              { id: 'rate_meal_lunch', title: '🍛 Lunch' },
              { id: 'rate_meal_snacks', title: '🥪 Snacks' },
              { id: 'rate_meal_dinner', title: '🍲 Dinner' },
              { id: 'main_menu', title: '🔙 Main Menu' }
            ]
          }]
        }
      }
    });
  }

  async sendParentWelcome(to, studentName) {
    const welcomeText = studentName 
      ? `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nYou are viewing the portal for ${studentName}.\nPlease choose your preferred parent service below:`
      : `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nPlease choose your preferred parent service below:`;
    
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: welcomeText
        },
        action: {
          button: 'Choose Service',
          sections: [{
            title: 'Select One Service',
            rows: [
              { id: 'principal_circulars', title: 'Principal Circulars', description: 'Latest college circulars' },
              { id: 'hod_circulars', title: 'HOD Circulars', description: 'Department specific circulars' },
              { id: 'marks', title: 'Academic Marks', description: 'View semester marks' },
              { id: 'admission_start', title: 'Sibling Admission', description: 'Apply for admission online' }
            ]
          }]
        }
      }
    });
  }

  async sendHelpdeskCategoryMenu(to, scholarType) {
    let rows = [];
    if (scholarType === 'Hostel') {
      rows.push({ id: 'issue_hostel', title: '🏠 Hostel Issue', description: 'Food, maintenance, etc.' });
    } else if (scholarType === 'Days Scholar') {
      rows.push({ id: 'issue_bus', title: '🚌 Bus Issue', description: 'Timing, routes, etc.' });
    }
    // All students can report college issues
    rows.push({ id: 'issue_college', title: '🏫 College Issue', description: 'General campus issues' });
    rows.push({ id: 'main_menu', title: '🔙 Main Menu', description: 'Return to main menu' });

    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: `🎫 *Helpdesk*\n\nPlease select the category for your issue:`
        },
        action: {
          button: 'Select Category',
          sections: [{
            title: 'Categories',
            rows: rows
          }]
        }
      }
    });
  }

  async sendStaffWelcome(to, staffName) {
    const welcomeText = staffName 
      ? `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nHello ${staffName}, please choose your preferred staff service below:`
      : `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nPlease choose your preferred staff service below:`;
    
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: welcomeText },
        action: {
          button: 'Choose Service',
          sections: [{
            title: 'Select One Service',
            rows: [
              { id: 'staff_complaint', title: 'Register Complaint', description: 'Report an issue & complaint' },
              { id: 'staff_admission', title: 'Sibling Admission', description: 'Admission application link' }
            ]
          }]
        }
      }
    });
  }

  async sendAcademicsMenu(to) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: '📚 Academics\n\nSelect an option:'
        },
        action: {
          button: 'Choose Option',
          sections: [{
            title: 'Academic Services',
            rows: [
              { id: 'marks', title: '📊 Marks', description: 'View semester marks' },
              { id: 'attendance', title: '📅 Attendance', description: 'View attendance %' },
              { id: 'timetable', title: '🕐 Time Table', description: 'View class schedule' },
              { id: 'main_menu', title: '🔙 Main Menu', description: 'Return to main menu' }
            ]
          }]
        }
      }
    });
  }

  async sendFeeMenu(to) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: '💰 Fee Balance\n\nWhat would you like to do?'
        },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'fee_check', title: 'Check Balance' } },
            { type: 'reply', reply: { id: 'fee_payment', title: 'Make Payment' } },
            { type: 'reply', reply: { id: 'main_menu', title: '🔙 Main Menu' } }
          ]
        }
      }
    });
  }

  async sendScholarTypeMenu(to) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: '✅ Registration number verified!\n\nAre you a Hosteller, Days Scholar, or Private?'
        },
        action: {
          button: 'Select Type',
          sections: [{
            title: 'Scholar Type',
            rows: [
              { id: 'scholar_hostel', title: '🏠 Hostel', description: 'Staying in college hostel' },
              { id: 'scholar_days', title: '🚌 Days Scholar', description: 'Using college transport' },
              { id: 'scholar_private', title: '🚶 Private', description: 'Own transport / Walk' }
            ]
          }]
        }
      }
    });
  }

  async sendRatingList(to, mealType) {
    const mealName = mealType.charAt(0).toUpperCase() + mealType.slice(1);
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: `🍽️ Please rate today's *${mealName}*:`
        },
        action: {
          button: 'Select Rating',
          sections: [{
            title: 'Rate Food Quality',
            rows: [
              { id: 'rating_10', title: '⭐⭐⭐⭐⭐ Excellent', description: 'Loved it! (10/10)' },
              { id: 'rating_8', title: '⭐⭐⭐⭐ Good', description: 'It was tasty (8/10)' },
              { id: 'rating_6', title: '⭐⭐⭐ Average', description: 'It was okay (6/10)' },
              { id: 'rating_4', title: '⭐⭐ Poor', description: 'Not good (4/10)' },
              { id: 'rating_2', title: '⭐ Terrible', description: 'Could not eat it (2/10)' }
            ]
          }]
        }
      }
    });
  }

  async sendWardenWelcome(to, wardenName, blockName) {
    const welcomeText = wardenName 
      ? `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nHello ${wardenName} (${blockName || 'Hostel'}), please choose your preferred warden service below:`
      : `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nPlease choose your preferred warden service below:`;
    
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: welcomeText },
        action: {
          button: 'Choose Service',
          sections: [{
            title: 'Select One Service',
            rows: [
              { id: 'warden_outing', title: 'Outing Applications', description: 'Manage new & return outings' },
              { id: 'warden_complaint', title: 'Hostel Complaints', description: 'Report a maintenance issue' },
              { id: 'warden_admission', title: 'Sibling Admission', description: 'Admission application link' }
            ]
          }]
        }
      }
    });
  }

  async sendSecurityGuardWelcome(to, guardName, gateAssigned) {
    const welcomeText = guardName 
      ? `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nHello ${guardName} (Post: ${gateAssigned || 'Gate 1'}), please choose your preferred security service below:\n\n*How to scan Student Outing Passes:*\n1️⃣ *Send Photo* of QR code here\n2️⃣ Or *Type/Paste* Reg Number\n3️⃣ Or use *Open Web Scanner* below for live video scan.`
      : `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nPlease choose your preferred security service below:`;
    
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: welcomeText },
        action: {
          button: 'Choose Service',
          sections: [
            {
              title: 'Select Gate Shift',
              rows: [
                { id: 'select_gate_1', title: 'Select Gate 1', description: 'Hostel Gate (Save for shift)' },
                { id: 'select_gate_2', title: 'Select Gate 2', description: 'Main Gate (Save for shift)' }
              ]
            },
            {
              title: 'Gate Operations',
              rows: [
                { id: 'security_open_scanner', title: 'Open Web Scanner', description: 'Live mobile video scanner' },
                { id: 'security_gate_logs', title: 'Today Gate Summary', description: 'View active outing counts' },
                { id: 'security_report_issue', title: 'Report Gate Issue', description: 'Send emergency alert' }
              ]
            }
          ]
        }
      }
    });
  }

  async sendDriverWelcome(to, driverName, busNumber, routeNumber) {
    const welcomeText = driverName 
      ? `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nHello ${driverName} (Bus No: ${busNumber || 'N/A'}, Route: ${routeNumber || 'N/A'}), please choose your preferred transport service below:`
      : `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\nPlease choose your preferred transport service below:`;
    
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: welcomeText },
        action: {
          button: 'Choose Service',
          sections: [{
            title: 'Select One Service',
            rows: [
              { id: 'driver_start_trip', title: 'Share Trip GPS', description: 'Share live GPS with parents' },
              { id: 'driver_route_info', title: 'Route Schedule', description: 'View bus route & stops' },
              { id: 'driver_report_issue', title: 'Report Bus Issue', description: 'Notify transport admin' }
            ]
          }]
        }
      }
    });
  }

  async sendTextMessage(to, text) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'text',
      text: { body: text }
    });
  }

  async sendMasterCategoryMenu(to) {
    const welcomeText =
      `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\n` +
      `Your convenience is our priority.\n\n` +
      `Experience efficient support with seamless access to a wide range of campus services.\n\n` +
      `Please choose your preferred campus service.\n\n` +
      `> తెలుగు / English భాష కోసం TE టైప్ చేయండి`;

    // Send unified welcome card with Velammal College Photo header, welcome address, and 3 buttons
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'image',
          image: {
            link: 'https://images.shiksha.com/mediadata/images/1572944747phpJ1CffI.jpeg'
          }
        },
        body: { text: welcomeText },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_choose_service', title: 'Choose Service' } },
            { type: 'reply', reply: { id: 'btn_admission', title: 'Admission' } },
            { type: 'reply', reply: { id: 'btn_language', title: 'Language (TE)' } }
          ]
        }
      }
    });
  }

  async sendCitizenServicesList(to) {
    const welcomeText =
      `Welcome to Velammal Institute of Technology citizen helper on Whatsapp.\n\n` +
      `Your convenience is our priority.\n\n` +
      `Experience efficient support with seamless access to a wide range of campus services.\n\n` +
      `Please choose your preferred campus service.`;

    const rows = [
      { id: 'student_login',        title: '📝 Registration',    description: 'Student & staff login registration' },
      { id: 'topic_placements',     title: '💼 Placements',      description: 'Career & placement records' },
      { id: 'topic_projects',       title: '🔬 Projects',        description: 'Student innovations & labs' },
      { id: 'topic_academics',      title: '📚 Academics',       description: 'Academic excellence' },
      { id: 'topic_achievements',   title: '🏆 Achievements',    description: 'Awards & recognitions' },
      { id: 'topic_hostel',         title: '🏠 Hostel',          description: 'Hostel life & facilities' },
      { id: 'topic_transportation', title: '🚌 Transportation',  description: '60+ college buses & routes' },
      { id: 'topic_sports',         title: '⚽ Sports',          description: 'Sports complex & gym' },
      { id: 'topic_hostelFood',     title: '🍽️ Hostel Food',     description: 'Dining, canteen & medical' },
      { id: 'topic_dept',           title: '🏛️ Departments',     description: '7 engineering departments' }
    ];

    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: welcomeText },
        action: {
          button: 'Choose Service',
          sections: [{
            title: 'Select One Service',
            rows: rows
          }]
        }
      }
    });
  }

  async sendAdmissionLinkCard(to) {
    const text =
      `🎓 *Velammal Institute of Technology - Online Admission Portal*\n\n` +
      `Apply online for B.E. / B.Tech Engineering Admissions through our official application portal:\n\n` +
      `🌐 *Admission Portal Link:*\nhttps://what-s-bot.onrender.com\n\n` +
      `🌐 *College Website:*\nhttps://velammalitech.edu.in/admission\n\n` +
      `📞 *Talk to Admission Officer:*\n` +
      `• Helpline 1: +91 98404 69096\n` +
      `• Helpline 2: +91 80560 30067\n` +
      `📧 *Email:* admission@velammalitech.edu.in\n\n` +
      `Click the link above to submit your admission application or speak with our admission counselor!`;

    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: text },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_choose_service', title: 'Choose Service' } }
          ]
        }
      }
    });
  }

  async sendLanguageInfoCard(to) {
    const text =
      `🌐 *భాష ఎంపిక / Language Preference*\n\n` +
      `మీరు తెలుగు లేదా ఇంగ్లీషులో సేవలను ఉపయోగించవచ్చు.\n` +
      `You can explore all campus services in English or Telugu.\n\n` +
      `కింద ఉన్న 'Choose Service' బటన్ క్లిక్ చేసి మీకు కావలసిన సేవను ఎంచుకోండి.\n` +
      `Please click 'Choose Service' below to select your service.`;

    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: text },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_choose_service', title: 'Choose Service' } }
          ]
        }
      }
    });
  }

  async sendMainMenuButton(to) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'To go back to the main menu, click below:' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'main_menu', title: 'Main Menu' } }
          ]
        }
      }
    });
  }

  async sendConfirmationMessage(to, studentDetails) {
    const text = `Please confirm your details:\n\n` +
      `📝 Reg Number: ${studentDetails.regNumber}\n` +
      `👤 Name: ${studentDetails.name}\n` +
      `🎓 Branch: ${studentDetails.branch}\n` +
      `📚 Section: ${studentDetails.section}`;

    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: text },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'confirm_yes', title: 'Yes' } },
            { type: 'reply', reply: { id: 'confirm_no', title: 'No' } }
          ]
        }
      }
    });
  }

  async sendAboutMessage(to, aboutText, aboutUrl) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text: aboutText },
        action: {
          name: 'cta_url',
          parameters: {
            display_text: 'Visit Website',
            url: aboutUrl
          }
        }
      }
    });
  }

  async sendContactMessage(to, contactNumber) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'text',
      text: { body: `📞 Contact us at: ${contactNumber}` }
    });
  }

  async sendStudentInfo(to, type, data) {
    let text = '';
    
    switch(type) {
      case 'marks':
        text = `📊 *Exam Marks:*\n\n`;
        let hasMarks = false;

        const formatExam = (examMap, title) => {
          if (examMap) {
            const entries = examMap instanceof Map ? Array.from(examMap.entries()) : Object.entries(examMap);
            if (entries.length > 0) {
              hasMarks = true;
              text += `*${title}*\n`;
              let total = 0;
              let count = 0;
              let rank = null;
              entries.forEach(([subject, mark]) => {
                if (subject.toLowerCase().trim() === 'rank') {
                  rank = mark;
                } else {
                  text += `• ${subject}: ${mark}\n`;
                  total += Number(mark) || 0;
                  count++;
                }
              });
              text += `_Total: ${total}_\n`;
              if (rank !== null) {
                text += `🏆 _Rank: ${rank}_\n`;
              }
              text += `\n`;
            }
          }
        };

        formatExam(data.marks.mid1, 'Mid Exam 1');
        formatExam(data.marks.mid2, 'Mid Exam 2');
        formatExam(data.marks.model, 'Model Exam');

        if (!hasMarks) {
          text += `No marks have been updated for you yet.\n\nPlease check back later or contact your admin.`;
        }
        break;
      case 'attendance':
        text = `📅 Attendance:\n\n` +
          `Attended: ${data.attendance.attendedClasses}/${data.attendance.totalClasses}\n` +
          `Percentage: ${data.attendance.percentage}%`;
        break;
      case 'transportation': {
        const TransportPlan = require('../models/TransportPlan');
        const plan = await TransportPlan.findOne().sort({ createdAt: -1 });

        if (plan) {
          await this.sendMessage(to, {
            messaging_product: 'whatsapp',
            type: 'document',
            document: {
              link: plan.fileUrl,
              filename: plan.fileName,
              caption: '🚌 *Master College Transportation List*'
            }
          });

          await new Promise(resolve => setTimeout(resolve, 500));

          return this.sendMessage(to, {
            messaging_product: 'whatsapp',
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text: 'Want to check your specific boarding details? Click the button below.' },
              action: {
                buttons: [
                  { type: 'reply', reply: { id: 'check_bus', title: 'Check My Bus' } }
                ]
              }
            }
          });
        }

        text = `🚌 *Transportation Details*\n\nWe haven't uploaded the master transport list yet. Please contact your admin.`;
        break;
      }
      case 'fee_check':
        text = `💰 Fee Balance:\n\n` +
          `Total Fees: ₹${data.fees.totalFees}\n` +
          `Paid: ₹${data.fees.paidFees}\n` +
          `Pending: ₹${data.fees.pendingFees}`;
        break;
      case 'fee_payment':
        if (data.fees.pendingFees <= 0) {
          return this.sendTextMessage(to, '✅ You have no pending fees to pay!');
        }
        
        const upiId = 'velammal@ybl';
        const payeeName = 'Velammalitech Fee Collection';
        const amount = data.fees.pendingFees;
        const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;

        return this.sendMessage(to, {
          messaging_product: 'whatsapp',
          type: 'image',
          image: {
            link: qrUrl,
            caption: `💳 *Pending Fee Payment*\n\nAmount Due: ₹${amount}\n\nScan this QR code using GPay, PhonePe, or Paytm to complete your payment.`
          }
        });
    }

    return this.sendTextMessage(to, text);
  }

  async sendTimetableMessage(to, timetable, student) {
    let caption = `🕐 *Class Time Table*\n\nBranch: ${student.branch} | Section: ${student.section}`;
    if (timetable.title) caption += `\n\n*${timetable.title}*`;
    if (timetable.description) caption += `\n_${timetable.description}_`;

    if (timetable.fileType === 'pdf' || timetable.fileType === 'word' || timetable.fileType === 'excel') {
      return this.sendMessage(to, {
        messaging_product: 'whatsapp',
        type: 'document',
        document: {
          link: timetable.imageUrl,
          caption: caption,
          filename: timetable.fileName || 'timetable'
        }
      });
    }

    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'image',
      image: {
        link: timetable.imageUrl,
        caption: caption
      }
    });
  }

  async sendTimetable(to, student) {
    const Timetable = require('../models/Timetable');
    
    let batch = '22';
    if (student.regNumber && student.regNumber.length >= 6) {
      batch = student.regNumber.substring(4, 6);
    }
    
    try {
      const timetables = await Timetable.find({
        batch: { $in: [batch, 'ALL'] },
        branch: { $in: [student.branch, 'ALL'] },
        section: { $in: [new RegExp(`^${student.section}$`, 'i'), 'ALL'] }
      });
      
      let timetable = null;
      if (timetables.length > 0) {
        timetables.sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;
          if (a.batch !== 'ALL') scoreA += 4;
          if (a.branch !== 'ALL') scoreA += 2;
          if (a.section !== 'ALL') scoreA += 1;
          
          if (b.batch !== 'ALL') scoreB += 4;
          if (b.branch !== 'ALL') scoreB += 2;
          if (b.section !== 'ALL') scoreB += 1;
          
          return scoreB - scoreA;
        });
        timetable = timetables[0];
      }
      
      if (!timetable || !timetable.imageUrl) {
        return this.sendTextMessage(to, '🕐 Timetable not uploaded yet for your class. Please contact your admin.');
      }
      
      return this.sendTimetableMessage(to, timetable, student);
    } catch (err) {
      console.error('Error fetching timetable:', err);
      return this.sendTextMessage(to, '🕐 Unable to fetch timetable at this moment.');
    }
  }

  async sendLatestCirculars(to, circulars) {
    if (!circulars || circulars.length === 0) {
      return this.sendTextMessage(to, '📢 No circulars available at the moment.');
    }
    const latest = circulars[0];
    return this.sendCircular(to, latest);
  }

  async sendCircular(to, circular) {
    const titlePrefix = circular.type === 'hod' ? 'HOD Circular' : 'Principal Circular';
    const caption = `📢 *${titlePrefix}*\n\n` +
      `*${circular.title}*\n\n` +
      `${circular.description || ''}\n\n` +
      `Date: ${new Date(circular.sentAt).toLocaleDateString()}`;

    if (!circular.fileUrl) {
      return this.sendMessage(to, {
        messaging_product: 'whatsapp',
        type: 'text',
        text: { body: caption }
      });
    }

    if (circular.fileType === 'image') {
      return this.sendMessage(to, {
        messaging_product: 'whatsapp',
        type: 'image',
        image: {
          link: circular.fileUrl,
          caption: caption
        }
      });
    } else {
      return this.sendMessage(to, {
        messaging_product: 'whatsapp',
        type: 'document',
        document: {
          link: circular.fileUrl,
          caption: caption,
          filename: circular.fileName
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ── ABOUT COLLEGE — Visitor Flow ────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Initial welcome for new (unregistered) visitors ──────────────────────────
  async sendInitialWelcome(to) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: '👋 *Welcome to Velammal Institute of Technology!*\n\nHow can we help you today?'
        },
        action: {
          button: 'Choose Option',
          sections: [{
            title: 'Main Menu',
            rows: [
              { id: 'student_login', title: '🎓 Registration', description: 'Login with your Reg Number' },
              { id: 'about_college', title: '🏫 About College', description: 'Learn about our campus' },
              { id: 'topic_dept', title: '🏛️ Departments', description: 'Explore departments' },
              { id: 'admission_start', title: '📋 Admission', description: 'Apply for admission online' }
            ]
          }]
        }
      }
    });
  }

  // ── About College — send intro video/images then show 2-button menu ──────────
  async sendAboutCollegeDetails(to) {
    try {
      const CollegeMedia = require('../models/CollegeMedia');
      const intro = await CollegeMedia.findOne({ topic: 'intro' });

      if (intro && intro.introVideoUrl) {
        await this.sendMessage(to, {
          messaging_product: 'whatsapp',
          type: 'video',
          video: {
            link: intro.introVideoUrl,
            caption: '🎓 *Velammal Institute of Technology*\n\nExplore our world-class facilities and vibrant campus life!'
          }
        });
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      if (intro && intro.mediaItems && intro.mediaItems.length > 0) {
        for (const item of intro.mediaItems.slice(0, 3)) {
          if (item.type === 'image') {
            await this.sendMessage(to, {
              messaging_product: 'whatsapp',
              type: 'image',
              image: { link: item.url, caption: item.caption || '🏫 Velammal Institute of Technology Campus' }
            });
            await new Promise(resolve => setTimeout(resolve, 400));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching intro media:', err.message);
    }

    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: 'Would you like to explore more about our college?'
        },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'more_options', title: 'More Options' } },
            { type: 'reply', reply: { id: 'back_to_main', title: 'Back' } }
          ]
        }
      }
    });
  }

  // ── More Options Menu — shows 9 topics (excluding Departments) ───────────────
  async sendMoreOptionsMenu(to) {
    return this.sendCitizenServicesList(to);
  }

  // ── Department More Options Menu ─────────────────────────────────────────────
  async sendDeptMoreOptionsMenu(to, deptTitle, deptKey) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: `🏛️ *Explore ${deptTitle} Department*\n\nSelect a topic to learn more:`
        },
        action: {
          button: 'Explore',
          sections: [{
            title: `${deptTitle} Highlights`,
            rows: [
              { id: `topic_dept_${deptKey}_placements`,       title: '💼 Placements',    description: 'Career & placement records' },
              { id: `topic_dept_${deptKey}_projects`,         title: '🔬 Projects',      description: 'Student innovations' },
              { id: `topic_dept_${deptKey}_academics`,        title: '📚 Academics',     description: 'Academic excellence' },
              { id: `topic_dept_${deptKey}_achievements`,     title: '🏆 Achievements',  description: 'Awards & recognitions' },
              { id: `topic_dept_${deptKey}_industrial_visit`, title: '🏭 Ind. Visit',    description: 'Industry exposure' },
              { id: `topic_dept_${deptKey}_sports`,           title: '⚽ Sports',        description: 'Sports & recreation' }
            ]
          }]
        }
      }
    });
  }

  // ── Department Sub-Menu — 7 departments ──────────────────────────────────────
  async sendDeptSubMenu(to) {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: '🏛️ *Departments*\n\nSelect a department to explore photos & videos:'
        },
        action: {
          button: 'Choose Dept',
          sections: [{
            title: 'Departments',
            rows: [
              { id: 'subdept_aids',         title: '🤖 AIDS',         description: 'AI & Data Science' },
              { id: 'subdept_cse',          title: '💻 CSE',          description: 'Computer Science & Engg' },
              { id: 'subdept_ece',          title: '📡 ECE',          description: 'Electronics & Communication' },
              { id: 'subdept_ee',           title: '⚡ EEE',          description: 'Electrical & Electronics' },
              { id: 'subdept_it',           title: '🌐 IT',           description: 'Information Technology' },
              { id: 'subdept_mech',         title: '⚙️ Mechanical',   description: 'Mechanical Engineering' },
              { id: 'subdept_mechatronics', title: '🦾 Mechatronics', description: 'Mechatronics Engineering' }
            ]
          }]
        }
      }
    });
  }

  // ── Send all media for a topic, then re-show the correct menu ────────────────
  async sendCollegeTopicMedia(to, topicKey) {
    const parts = topicKey.split('_');
    const isMainDeptInfo = topicKey.startsWith('dept_') && parts.length === 2;
    const isDeptSubtopic = topicKey.startsWith('dept_') && parts.length >= 3;

    try {
      const CollegeMedia = require('../models/CollegeMedia');
      const topic = await CollegeMedia.findOne({ topic: topicKey });

      if (!topic) {
        await this.sendTextMessage(to, '⚠️ Information for this topic is coming soon. Please check back later!');
        if (isMainDeptInfo) return this.sendDeptSubMenu(to);
        if (isDeptSubtopic) return this.sendDeptMoreOptionsMenu(to, parts[1].toUpperCase(), `dept_${parts[1]}`);
        return this.sendMoreOptionsMenu(to);
      }

      const { title, emoji, description, mediaItems } = topic;

      // Ensure intro video is sent if available for main dept info
      if (isMainDeptInfo && topic.introVideoUrl) {
        await this.sendMessage(to, {
          messaging_product: 'whatsapp',
          type: 'video',
          video: {
            link: topic.introVideoUrl,
            caption: `🏛️ *${title}*\n\nExplore our department!`
          }
        });
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      if (!mediaItems || mediaItems.length === 0) {
        if (!isMainDeptInfo || !topic.introVideoUrl) {
          await this.sendTextMessage(to,
            `${emoji} *${title}*\n\n${description || 'Content for this section is being prepared. Please check back soon!'}`
          );
        }
        
        if (isMainDeptInfo) {
          return this.sendDeptMoreOptionsMenu(to, parts[1].toUpperCase(), parts[1]);
        }
        if (isDeptSubtopic) return this.sendDeptMoreOptionsMenu(to, parts[1].toUpperCase(), `dept_${parts[1]}`);
        return this.sendMoreOptionsMenu(to);
      }

      await this.sendTextMessage(to, `${emoji} *${title}*\n\n${description || ''}`);
      await new Promise(resolve => setTimeout(resolve, 400));

      for (const item of mediaItems) {
        if (item.type === 'image') {
          await this.sendMessage(to, {
            messaging_product: 'whatsapp',
            type: 'image',
            image: { link: item.url, caption: item.caption || '' }
          });
        } else if (item.type === 'video') {
          await this.sendMessage(to, {
            messaging_product: 'whatsapp',
            type: 'video',
            video: { link: item.url, caption: item.caption || '' }
          });
        }
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    } catch (err) {
      console.error(`Error fetching topic media for ${topicKey}:`, err.message);
      await this.sendTextMessage(to, '⚠️ Unable to load content right now. Please try again.');
    }

    if (isMainDeptInfo) {
      return this.sendDeptMoreOptionsMenu(to, parts[1].toUpperCase(), parts[1]);
    }

    // For subtopics and general topics, offer Back and Main Menu
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'Would you like to explore more?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'more_options', title: '🔙 Back' } },
            { type: 'reply', reply: { id: 'main_menu', title: '🏠 Main Menu' } }
          ]
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ── ADMISSION FLOW ──────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  async sendAdmissionWelcome(to) {
    return this.sendCitizenServicesList(to);
  }

  async sendAdmissionDepartmentMenu(to) {
    const text = 
      `Select Engineering Department\n\n` +
      `Velammal Institute of Technology offers cutting-edge undergraduate engineering programs.\n` +
      `Please choose a department below to explore placements, projects, and industrial visits:`;

    const rows = [
      { id: 'dept_aids', title: 'AI & DS', description: 'Artificial Intelligence & Data Science' },
      { id: 'dept_ece', title: 'ECE Department', description: 'Electronics & Communication Engg' },
      { id: 'dept_cse', title: 'CSE Department', description: 'Computer Science & Engineering' },
      { id: 'dept_eee', title: 'EEE Department', description: 'Electrical & Electronics Engg' },
      { id: 'dept_mech', title: 'Mechanical Engg', description: 'Mechanical Engineering' },
      { id: 'dept_mechatronics', title: 'Mechatronics', description: 'Mechatronics Engineering' },
      { id: 'dept_it', title: 'IT Department', description: 'Information Technology' },
      { id: 'adm_main', title: 'Admission Menu', description: 'Return to main admission menu' }
    ];

    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: text },
        action: {
          button: 'Choose Service',
          sections: [{
            title: 'Select One Service',
            rows: rows
          }]
        }
      }
    });
  }

  async sendDepartmentExploreMenu(to, deptName = 'Department') {
    const text = 
      `Explore: ${deptName}\n\n` +
      `Discover career opportunities, research labs, achievements, and industry exposure in ${deptName}:\n\n` +
      `Choose an option below to learn more:`;

    const rows = [
      { id: `dept_exp_placements_${deptName}`, title: 'Placements', description: `${deptName} placement records` },
      { id: `dept_exp_projects_${deptName}`, title: 'Projects', description: `${deptName} student innovations` },
      { id: `dept_exp_academics_${deptName}`, title: 'Academics', description: `${deptName} academic excellence` },
      { id: `dept_exp_achievements_${deptName}`, title: 'Achievements', description: `${deptName} awards & trophies` },
      { id: `dept_exp_ind_visit_${deptName}`, title: 'Industrial Visit', description: `${deptName} industry exposure` },
      { id: `dept_exp_sports_${deptName}`, title: 'Sports Facility', description: `${deptName} sports & recreation` },
      { id: 'adm_departments', title: 'Change Department', description: 'Select another department' },
      { id: 'adm_main', title: 'Admission Menu', description: 'Return to admission menu' }
    ];

    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: text },
        action: {
          button: 'Choose Service',
          sections: [{
            title: 'Select One Service',
            rows: rows
          }]
        }
      }
    });
  }

  async downloadMedia(mediaId) {
    try {
      if (!this.token) return null;
      const metaRes = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      const mediaUrl = metaRes.data.url;
      if (!mediaUrl) return null;

      const imgRes = await axios.get(mediaUrl, {
        headers: { Authorization: `Bearer ${this.token}` },
        responseType: 'arraybuffer'
      });
      return Buffer.from(imgRes.data);
    } catch (err) {
      console.error('Error downloading WhatsApp media:', err.message);
      return null;
    }
  }
}

module.exports = new WhatsAppService();
