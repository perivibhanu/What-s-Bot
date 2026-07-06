const Student = require('../models/Student');
const xlsx = require('xlsx');
const fs = require('fs');

// ─── Normalize phone number to match WhatsApp format (e.g., 917032055712) ────
const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, ''); // remove non-digits
  if (digits.length === 10) return '91' + digits;                          // 9876543210 → 91...
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1); // 09876... → 91...
  return digits; // already has country code
};

// ─── GET all students ─────────────────────────────────────────────────────────
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── GET student by ID ────────────────────────────────────────────────────────
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── POST create single student ───────────────────────────────────────────────
exports.createStudent = async (req, res) => {
  try {
    const { regNumber, name, branch, section, phoneNumber, parentPhoneNumber } = req.body;

    const data = { regNumber, name, branch, section };

    // If phone number provided → auto-register
    if (phoneNumber) {
      data.phoneNumber = normalizePhone(phoneNumber);
      data.isRegistered = true;
    }
    if (parentPhoneNumber) {
      data.parentPhoneNumber = normalizePhone(parentPhoneNumber);
    }

    const student = await Student.create(data);
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ─── PUT update student ───────────────────────────────────────────────────────
exports.updateStudent = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Normalize phone if provided
    if (updates.phoneNumber) {
      updates.phoneNumber = normalizePhone(updates.phoneNumber);
      updates.isRegistered = true;
    }
    if (updates.parentPhoneNumber) {
      updates.parentPhoneNumber = normalizePhone(updates.parentPhoneNumber);
    }

    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ─── DELETE student ───────────────────────────────────────────────────────────
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── POST bulk import students from Excel/CSV ─────────────────────────────────
exports.bulkImportStudents = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

    if (rawData.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'The file is empty or has no data rows.' });
    }

    // Normalize header keys
    const normalize = (str) => String(str).toLowerCase().replace(/[\s_\-()]/g, '').trim();

    const normalizedData = rawData.map(row => {
      const n = {};
      Object.keys(row).forEach(key => { n[normalize(key)] = String(row[key]).trim(); });
      return n;
    });

    // Flexible column name matching
    const getField = (row, ...aliases) => {
      for (const alias of aliases) {
        const val = row[normalize(alias)];
        if (val !== undefined && val !== '') return val;
      }
      return '';
    };

    const results = { success: 0, updated: 0, skipped: 0, errors: [], skippedList: [] };

    for (let i = 0; i < normalizedData.length; i++) {
      const row = normalizedData[i];
      const rowNum = i + 2;

      const regNumber = getField(row,
        'registrationnumber', 'registration number', 'regnumber', 'reg number',
        'regno', 'rollno', 'roll no'
      ).toUpperCase();

      const name = getField(row, 'studentname', 'student name', 'name', 'fullname', 'full name');
      const branch = getField(row, 'dept', 'department', 'branch');
      const section = getField(row, 'section', 'sec', 'class');
      const rawPhone = getField(row,
        'studentmobilenumber', 'student mobile number', 'mobilenumber', 'mobile number', 'mobile', 'phone', 'phonenumber',
        'phone number', 'whatsapp', 'whatsappnumber', 'contact', 'contactnumber'
      );
      const rawParentPhone = getField(row,
        'parentwhatsappnumber', 'parent whatsapp number', 'parentmobilenumber', 'parent mobile number', 'parent mobile', 'parent phone', 'parent phonenumber',
        'parent phone number', 'parent whatsapp', 'parent contact', 'parent contactnumber'
      );

      // Validate required fields
      if (!regNumber || !name || !branch || !section) {
        results.errors.push({
          row: rowNum,
          data: { regNumber, name, branch, section },
          reason: `Missing: ${[!regNumber && 'Reg Number', !name && 'Name', !branch && 'Branch', !section && 'Section'].filter(Boolean).join(', ')}`
        });
        continue;
      }

      const phoneNumber = rawPhone ? normalizePhone(rawPhone) : '';
      const hasPhone = phoneNumber.length >= 10;
      
      const parentPhoneNumber = rawParentPhone ? normalizePhone(rawParentPhone) : '';
      const hasParentPhone = parentPhoneNumber.length >= 10;

      try {
        const existing = await Student.findOne({ regNumber });

        if (existing) {
          // Update phone if provided and not already set
          let isUpdated = false;
          if (hasPhone && !existing.phoneNumber) {
            existing.phoneNumber = phoneNumber;
            existing.isRegistered = true;
            isUpdated = true;
          }
          if (hasParentPhone && !existing.parentPhoneNumber) {
            existing.parentPhoneNumber = parentPhoneNumber;
            isUpdated = true;
          }

          if (isUpdated) {
            await existing.save();
            results.updated++;
          } else {
            results.skipped++;
            results.skippedList.push({ regNumber, name, reason: 'Already exists' });
          }
        } else {
          // Create new student
          const studentData = {
            regNumber, name, branch, section,
            ...(hasPhone && { phoneNumber, isRegistered: true }),
            ...(hasParentPhone && { parentPhoneNumber })
          };
          await Student.create(studentData);
          results.success++;
        }
      } catch (err) {
        results.errors.push({ row: rowNum, data: { regNumber, name }, reason: err.message });
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({
      message: `Import complete: ${results.success} added, ${results.updated} updated with phone, ${results.skipped} skipped, ${results.errors.length} failed`,
      summary: {
        totalRows: normalizedData.length,
        success: results.success,
        updated: results.updated,
        skipped: results.skipped,
        failed: results.errors.length
      },
      errors: results.errors.slice(0, 20),
      skippedList: results.skippedList.slice(0, 10)
    });

  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Bulk import error:', error);
    res.status(500).json({
      error: 'Failed to process file. Make sure it is a valid Excel (.xlsx) or CSV (.csv) file.',
      details: error.message
    });
  }
};

// ─── GET download sample Excel template ───────────────────────────────────────
exports.downloadTemplate = (req, res) => {
  try {
    const sampleData = [
      { 'Registration Number': '21CS001', 'Student Name': 'Arun Kumar',    'Dept': 'CSE',  'Section': 'A', 'Student Mobile Number': '9876543210', 'Parent WhatsApp Number': '9876543220' },
      { 'Registration Number': '21CS002', 'Student Name': 'Priya Sharma',  'Dept': 'CSE',  'Section': 'A', 'Student Mobile Number': '9876543211', 'Parent WhatsApp Number': '9876543221' },
      { 'Registration Number': '21EC001', 'Student Name': 'Ravi Balaji',   'Dept': 'ECE',  'Section': 'B', 'Student Mobile Number': '9876543212', 'Parent WhatsApp Number': '9876543222' },
      { 'Registration Number': '21ME001', 'Student Name': 'Sundar Murthy', 'Dept': 'MECH', 'Section': 'A', 'Student Mobile Number': '9876543213', 'Parent WhatsApp Number': '9876543223' },
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    const workbook = xlsx.utils.book_new();

    worksheet['!cols'] = [
      { wch: 20 }, // Registration Number
      { wch: 25 }, // Student Name
      { wch: 10 }, // Dept
      { wch: 10 }, // Section
      { wch: 22 }, // Student Mobile Number
      { wch: 25 }, // Parent WhatsApp Number
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Students');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate template: ' + error.message });
  }
};

// ─── GET distinct batch years from student reg numbers ────────────────────────
exports.getBatchYears = async (req, res) => {
  try {
    const students = await Student.find({}, { regNumber: 1 });
    const batchSet = new Set();
    students.forEach(s => {
      if (s.regNumber && s.regNumber.length >= 6) {
        batchSet.add(s.regNumber.substring(4, 6));
      }
    });
    // Sort descending (latest batch first)
    const batches = Array.from(batchSet).sort((a, b) => Number(b) - Number(a));
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── DELETE bulk delete students by batch year ────────────────────────────────
exports.bulkDeleteByBatch = async (req, res) => {
  try {
    const batchYear = req.params.batchYear;
    if (!batchYear || batchYear.length !== 2) {
      return res.status(400).json({ error: 'Invalid batch year format. Expected 2 digits (e.g. 22).' });
    }

    // Reg number format: 1133 + batchYear + ...
    const pattern = `^1133${batchYear}`;
    
    // Delete all matching students
    const result = await Student.deleteMany({ regNumber: { $regex: new RegExp(pattern, 'i') } });
    
    res.json({ 
      message: `Successfully deleted ${result.deletedCount} students from batch ${batchYear}.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
