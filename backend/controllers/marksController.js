const Student = require('../models/Student');
const whatsappService = require('../services/whatsappService');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// ─── Helper: Get Regex for Reg Number Matching ─────────────────────────────────
// Reg No Format: [College Code 4 digits][Batch 2 digits][Dept Code 3 digits][Roll No 3 digits]
// Example: 1133 22 106 116
const getRegNoRegex = (batch, branchCode) => {
  // Batch usually comes as full year (2022) or just 22
  const shortBatch = String(batch).slice(-2); 
  // Pattern: ^[Any 4 digits]{shortBatch}{branchCode}[Any 3 digits]$
  return new RegExp(`^\\d{4}${shortBatch}${branchCode}\\d{3}$`, 'i');
};

const getBranchCode = (branchName) => {
  const codes = {
    'ECE': '106',
    'CSE': '104',
    'IT': '205',
    'EEE': '105',
    'MECH': '114',
    'AIDS': '243',
    'MECHATRONICS': '115'
  };
  return codes[branchName.toUpperCase()] || '';
};

// ─── POST download targeted template ──────────────────────────────────────────
exports.downloadTemplate = async (req, res) => {
  try {
    const { batch, branch, section, subjectsCount = 6 } = req.body;
    
    // section might be an array
    const sections = Array.isArray(section) ? section : [section].filter(Boolean);

    const branchCode = getBranchCode(branch);
    if (!branchCode) {
      return res.status(400).json({ error: `Unknown branch code for ${branch}` });
    }

    const regex = getRegNoRegex(batch, branchCode);
    
    let sectionQuery = {};
    if (sections.length > 0) {
      sectionQuery = { section: { $in: sections.map(s => new RegExp(`^${s}$`, 'i')) } };
    }

    // Find students matching this exact cohort
    const students = await Student.find({
      regNumber: regex,
      ...sectionQuery
    }).sort({ regNumber: 1 });

    if (students.length === 0) {
      return res.status(404).json({ 
        error: `No students found for ${branch} Batch ${batch} Section ${section}. Make sure they are imported first.` 
      });
    }

    // Build template data
    const templateData = students.map(s => {
      const row = {
        'Reg Number': s.regNumber,
        'Name': s.name
      };
      
      // Add generic subject columns
      for(let i=1; i<=subjectsCount; i++) {
        row[`Subject ${i}`] = '';
      }
      row['Rank'] = '';
      return row;
    });

    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();

    // Set column widths
    const cols = [ { wch: 15 }, { wch: 25 } ];
    for(let i=1; i<=subjectsCount; i++) cols.push({ wch: 12 });
    worksheet['!cols'] = cols;

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Marks');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=${branch}_${batch}_Sec${section}_Marks.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    res.status(500).json({ error: 'Failed to generate template: ' + error.message });
  }
};

// ─── POST upload marks and send via WhatsApp ──────────────────────────────────
exports.uploadMarks = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { batch, branch, section, examType, message } = req.body;
  const filePath = req.file.path;

  let parsedSections = [];
  try {
    parsedSections = JSON.parse(section);
  } catch (e) {
    parsedSections = [section];
  }
  const sections = Array.isArray(parsedSections) ? parsedSections : [parsedSections].filter(Boolean);

  if (!batch || !branch || sections.length === 0 || !examType) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(400).json({ error: 'Batch, Branch, Section(s), and ExamType are required.' });
  }

  if (!['mid1', 'mid2', 'model'].includes(examType)) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(400).json({ error: 'Invalid exam type. Must be mid1, mid2, or model.' });
  }

  const branchCode = getBranchCode(branch);
  const regex = getRegNoRegex(batch, branchCode);

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    if (rawData.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'The uploaded file is empty.' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Parse and process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2;
      
      // Find reg number key flexibly
      const regKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s/g, '').includes('regnumber'));
      const regNumber = regKey ? String(row[regKey]).trim().toUpperCase() : null;

      if (!regNumber) {
        results.errors.push({ row: rowNum, reason: 'Missing Registration Number' });
        continue;
      }

      // Security Check: Does this reg number actually belong to the selected cohort?
      if (!regex.test(regNumber)) {
        results.errors.push({ 
          row: rowNum, 
          reason: `Security Rejection: ${regNumber} does not belong to ${branch} Batch ${batch}`
        });
        continue;
      }

      // Find the student in DB
      const student = await Student.findOne({ 
        regNumber, 
        section: { $in: sections.map(s => new RegExp(`^${s}$`, 'i')) }
      });

      if (!student) {
        results.errors.push({ 
          row: rowNum, 
          reason: `Student ${regNumber} not found in database for selected Sections`
        });
        continue;
      }

      // Extract Subject marks (any column that isn't Reg Number or Name)
      const subjectMarks = {};
      let hasMarks = false;

      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase().replace(/\s/g, '');
        if (lowerKey.includes('regnumber') || lowerKey.includes('name')) return;
        
        const mark = row[key];
        if (mark !== '' && mark !== null && !isNaN(Number(mark))) {
          subjectMarks[key.trim()] = Number(mark);
          hasMarks = true;
        }
      });

      if (!hasMarks) {
        results.errors.push({ row: rowNum, reason: `No valid marks found for ${regNumber}` });
        continue;
      }

      // Save to database
      if (!student.marks) student.marks = {};
      
      student.marks[examType] = subjectMarks;
      await student.save();

      // Send WhatsApp Notification (only if registered)
      if (student.isRegistered) {
        let sentAny = false;
        try {
          if (student.phoneNumber) {
            await sendMarksNotification(student.phoneNumber, student, examType, subjectMarks, message);
            sentAny = true;
          }
          if (student.parentPhoneNumber) {
            await sendMarksNotification(student.parentPhoneNumber, student, examType, subjectMarks, message);
            sentAny = true;
          }
          
          if (sentAny) {
            results.success++;
            // Small delay to prevent rate limiting
            await new Promise(r => setTimeout(r, 200));
          } else {
            results.errors.push({ 
              row: rowNum, 
              reason: `Saved marks, but ${regNumber} has no phone numbers saved`
            });
            results.failed++;
          }
        } catch (waErr) {
          results.errors.push({ 
            row: rowNum, 
            reason: `Saved marks, but failed to send WhatsApp to ${regNumber}`
          });
          results.failed++;
        }
      } else {
        results.errors.push({ 
          row: rowNum, 
          reason: `Saved marks, but ${regNumber} is not registered on WhatsApp`
        });
        results.failed++;
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({
      message: `Processed ${rawData.length} students. Sent ${results.success} messages successfully.`,
      summary: results
    });

  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Marks upload error:', error);
    res.status(500).json({ error: 'Failed to process marks file', details: error.message });
  }
};

// ─── WhatsApp Message Formatter ───────────────────────────────────────────────
async function sendMarksNotification(to, student, examType, subjectMarks, optionalMessage) {
  const examNames = {
    'mid1': 'Mid Exam 1',
    'mid2': 'Mid Exam 2',
    'model': 'Model Exam'
  };

  const hasMid1 = student.marks?.mid1 && Object.keys(typeof student.marks.mid1.toJSON === 'function' ? student.marks.mid1.toJSON() : student.marks.mid1).length > 0;
  const hasMid2 = student.marks?.mid2 && Object.keys(typeof student.marks.mid2.toJSON === 'function' ? student.marks.mid2.toJSON() : student.marks.mid2).length > 0;
  const hasModel = student.marks?.model && Object.keys(typeof student.marks.model.toJSON === 'function' ? student.marks.model.toJSON() : student.marks.model).length > 0;

  let messageText = 
    `📊 *Exam Results - ${examNames[examType]}*\n\n` +
    `🏫 Department: ${student.branch} | Section: ${student.section}\n` +
    `🎓 Reg No: ${student.regNumber}\n` +
    `👤 Name: ${student.name}\n\n`;

  const buildMarksSection = (title, map) => {
    let sectionText = `📝 *${title}:*\n`;
    let secTotal = 0;
    let secRank = null;
    
    let plainMap = typeof map.toJSON === 'function' ? map.toJSON() : map;
    
    Object.entries(plainMap).forEach(([subj, mk]) => {
      const lowerSubj = subj.toLowerCase().trim();
      if (lowerSubj === 'rank') {
        secRank = mk;
      } else {
        sectionText += `• ${subj}: ${mk}\n`;
        secTotal += Number(mk);
      }
    });
    
    sectionText += `📈 *Total Score:* ${secTotal}\n`;
    if (secRank !== null && secRank !== undefined && secRank !== '') {
      sectionText += `🏆 *Rank:* ${secRank}\n`;
    }
    return sectionText + '\n';
  };

  // Stack them vertically based on what exists
  if (hasMid1) {
    messageText += buildMarksSection('Mid Exam 1', student.marks.mid1);
  }
  if (hasMid2) {
    messageText += buildMarksSection('Mid Exam 2', student.marks.mid2);
  }
  if (hasModel) {
    messageText += buildMarksSection('Model Exam', student.marks.model);
  }

  messageText += (optionalMessage ? `📢 *Admin Note:*\n${optionalMessage}\n\n` : '') +
    `Keep it up! 🎉\n` +
    `— Velammalitech Admin`;

  return whatsappService.sendTextMessage(to, messageText);
}

// ─── POST Clear Old Marks ─────────────────────────────────────────────────────
exports.clearMarks = async (req, res) => {
  try {
    const { batch, branch, section, examsToClear } = req.body;
    
    if (!batch || !branch || !section) {
      return res.status(400).json({ error: 'Batch, Branch, and Section are required to clear marks.' });
    }

    if (!examsToClear || !Array.isArray(examsToClear) || examsToClear.length === 0) {
      return res.status(400).json({ error: 'Please select at least one exam to clear.' });
    }

    const branchCode = getBranchCode(branch);
    if (!branchCode) {
      return res.status(400).json({ error: `Unknown branch code for ${branch}` });
    }

    const regex = getRegNoRegex(batch, branchCode);
    const sections = Array.isArray(section) ? section : [section].filter(Boolean);

    const students = await Student.find({
      regNumber: regex,
      ...(sections.length > 0 && { section: { $in: sections.map(s => new RegExp(`^${s}$`, 'i')) } })
    });

    if (students.length === 0) {
      return res.status(404).json({ error: 'No students found to clear marks.' });
    }

    let clearedCount = 0;
    for (const student of students) {
      if (student.marks) {
        if (examsToClear.includes('mid1')) student.marks.mid1 = {};
        if (examsToClear.includes('mid2')) student.marks.mid2 = {};
        if (examsToClear.includes('model')) student.marks.model = {};
        await student.save();
        clearedCount++;
      }
    }

    const clearedNames = examsToClear.map(e => e === 'mid1' ? 'Mid 1' : (e === 'mid2' ? 'Mid 2' : 'Model')).join(', ');
    res.json({ message: `Successfully cleared ${clearedNames} marks for ${clearedCount} students in ${branch} Sec ${section}.` });
  } catch (error) {
    console.error('Error clearing marks:', error);
    res.status(500).json({ error: 'Failed to clear marks: ' + error.message });
  }
};
