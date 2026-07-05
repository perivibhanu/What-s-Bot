const Staff = require('../models/Staff');

// Get all staff, optionally filtered by type and department
exports.getStaff = async (req, res) => {
  try {
    const { type, department } = req.query;
    let query = {};
    if (type) query.type = type;
    if (department) query.department = department;

    const staffList = await Staff.find(query).sort({ createdAt: -1 });
    res.json(staffList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new staff member
exports.createStaff = async (req, res) => {
  try {
    const { type, name, department, contactDetails, labName } = req.body;

    // Validate required fields
    if (!type || !name || !department || !contactDetails) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (type === 'lab_assistant' && !labName) {
      return res.status(400).json({ error: 'Lab Name is required for lab assistants' });
    }

    const newStaff = await Staff.create({
      type,
      name,
      department,
      contactDetails,
      labName: type === 'lab_assistant' ? labName : undefined
    });

    res.status(201).json(newStaff);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Phone Number / Contact Details already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Update a staff member
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedStaff = await Staff.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(updatedStaff);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Phone Number / Contact Details already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete a staff member
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStaff = await Staff.findByIdAndDelete(id);
    
    if (!deletedStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const xlsx = require('xlsx');
const fs = require('fs');

// ─── POST bulk import staff from Excel/CSV ─────────────────────────────────
exports.bulkImportStaff = async (req, res) => {
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

      const typeRaw = getField(row, 'type', 'stafftype', 'role');
      const type = typeRaw.toLowerCase().includes('lab') ? 'lab_assistant' : 'teaching';
      
      const name = getField(row, 'name', 'fullname', 'staffname');
      const department = getField(row, 'department', 'dept', 'branch');
      const contactDetails = getField(row, 'contactdetails', 'contact', 'phone', 'email', 'mobile');
      const labName = getField(row, 'labname', 'lab');

      if (!name || !department || !contactDetails || (type === 'lab_assistant' && !labName)) {
        results.errors.push({
          row: rowNum,
          data: { name, department, contactDetails, type },
          reason: `Missing required field for ${type}`
        });
        continue;
      }

      try {
        const existing = await Staff.findOne({ contactDetails });
        if (existing) {
          results.skipped++;
          results.skippedList.push({ contactDetails, name, reason: 'Already exists' });
        } else {
          await Staff.create({
            type, name, department, contactDetails,
            labName: type === 'lab_assistant' ? labName : undefined
          });
          results.success++;
        }
      } catch (err) {
        results.errors.push({ row: rowNum, data: { contactDetails, name }, reason: err.message });
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({
      message: `Import complete: ${results.success} added, ${results.skipped} skipped, ${results.errors.length} failed`,
      summary: {
        totalRows: normalizedData.length,
        success: results.success,
        skipped: results.skipped,
        failed: results.errors.length
      },
      errors: results.errors.slice(0, 20)
    });

  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process file.', details: error.message });
  }
};

// ─── GET download sample Excel template ───────────────────────────────────────
exports.downloadTemplate = (req, res) => {
  try {
    const sampleData = [
      { 'Type (teaching / lab_assistant)': 'teaching', 'Name': 'Dr. Sarah', 'Department': 'CSE', 'Contact Details': '9876543210', 'Lab Name': '' },
      { 'Type (teaching / lab_assistant)': 'lab_assistant', 'Name': 'John Doe', 'Department': 'ECE', 'Contact Details': '9123456780', 'Lab Name': 'Electronics Lab 1' },
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    const workbook = xlsx.utils.book_new();

    worksheet['!cols'] = [
      { wch: 30 }, // Type
      { wch: 25 }, // Name
      { wch: 15 }, // Dept
      { wch: 25 }, // Contact
      { wch: 25 }, // Lab Name
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Staff');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=staff_import_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate template: ' + error.message });
  }
};
