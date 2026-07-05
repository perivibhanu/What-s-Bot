const Student = require('../models/Student');
const TransportPlan = require('../models/TransportPlan');
const xlsx = require('xlsx');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

// Helpers for Reg Number Matching
const getBranchCode = (branchName) => {
  const codes = { 'ECE': '106', 'CSE': '104', 'IT': '205', 'EEE': '105', 'MECH': '114', 'AIDS': '243', 'MECHATRONICS': '115' };
  return codes[branchName.toUpperCase()] || '';
};

const getRegNoRegex = (batch, branchCode) => {
  const shortBatch = String(batch).slice(-2);
  return new RegExp(`^\\d{4}${shortBatch}${branchCode}\\d{3}$`, 'i');
};

exports.downloadDataTemplate = async (req, res) => {
  try {
    const { batch, branch, section, type, feeColumns } = req.body;
    
    if (!batch || !branch || !section || !type) {
      return res.status(400).json({ error: 'Batch, Branch, Section, and Type are required' });
    }

    const branchCode = getBranchCode(branch);
    const regex = getRegNoRegex(batch, branchCode);

    const students = await Student.find({ regNumber: regex, section: new RegExp(`^${section}$`, 'i') }).sort({ regNumber: 1 });
    if (students.length === 0) {
      return res.status(404).json({ error: 'No students found for this class.' });
    }

    const templateData = students.map(s => {
      const row = { 'Reg Number': s.regNumber, 'Name': s.name };
      
      if (type === 'attendance') {
        row['Total Classes'] = s.attendance?.totalClasses || 0;
        row['Attended Classes'] = s.attendance?.attendedClasses || 0;
      } else if (type === 'transport') {
        row['Bus Route'] = s.transportation?.busRoute || '';
        row['Bus Number'] = s.transportation?.busNumber || '';
      } else if (type === 'fees') {
        if (feeColumns) {
          if (feeColumns.collegeFee) row['College Fee'] = s.fees?.collegeFee || 0;
          if (feeColumns.hostelFee) row['Hostel Fee'] = s.fees?.hostelFee || 0;
          if (feeColumns.transportationFee) row['Transportation Fee'] = s.fees?.transportationFee || 0;
          if (feeColumns.breakageFee) row['Common Breakage Fee'] = s.fees?.breakageFee || 0;
        } else {
          row['Total Fees'] = s.fees?.totalFees || 0;
        }
        row['Paid Fees'] = s.fees?.paidFees || 0;
      }
      return row;
    });

    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    worksheet['!cols'] = [ { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 } ];
    
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Data');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=${branch}_Batch${batch}_Sec${section}_${type}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate template: ' + error.message });
  }
};

exports.uploadData = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Add isAllStudents from body (which could be string "true" or boolean)
  const { batch, branch, section, type, isAllStudents } = req.body;
  const filePath = req.file.path;
  const isGlobal = isAllStudents === 'true' || isAllStudents === true;

  if (!type || (!isGlobal && (!batch || !branch || !section))) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let branchCode = '';
  let regex = null;
  
  if (!isGlobal) {
    branchCode = getBranchCode(branch);
    regex = getRegNoRegex(batch, branchCode);
  }

  try {
    // If it's transport, upload the raw file to Cloudinary first
    if (type === 'transport') {
      const uploadOptions = {
        folder: 'vcet/transport',
        resource_type: 'raw', // They fixed the Cloudinary raw setting
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      };
      
      const result = await cloudinary.uploader.upload(filePath, uploadOptions);
      
      // Save it in the TransportPlan collection
      await TransportPlan.deleteMany({}); // Keep only the latest one
      await TransportPlan.create({
        fileUrl: result.secure_url,
        fileName: req.file.originalname || 'transport_plan.xlsx',
        cloudinaryId: result.public_id
      });
    }

    const workbook = xlsx.readFile(filePath);
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });

    let success = 0, failed = 0, errors = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2;
      
      const regKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s/g, '').includes('regnumber'));
      const regNumber = regKey ? String(row[regKey]).trim().toUpperCase() : null;

      // If it's a global upload (like transport), we just need a valid registration number
      if (!regNumber || (!isGlobal && !regex.test(regNumber))) {
        errors.push({ row: rowNum, reason: 'Invalid or missing Registration Number for this cohort' });
        failed++; continue;
      }

      // If isGlobal, find by regNumber only. Otherwise, find by regNumber and section.
      const query = { regNumber };
      if (!isGlobal) {
        query.section = new RegExp(`^${section}$`, 'i');
      }

      const student = await Student.findOne(query);
      if (!student) {
        errors.push({ row: rowNum, reason: 'Student not found' });
        failed++; continue;
      }

      if (type === 'attendance') {
        const total = Number(row['Total Classes']) || 0;
        const attended = Number(row['Attended Classes']) || 0;
        const percentage = total > 0 ? ((attended / total) * 100).toFixed(2) : 0;
        student.attendance = { totalClasses: total, attendedClasses: attended, percentage: Number(percentage) };
      } else if (type === 'transport') {
        student.transportation = {
          busName: row['Bus Name'] || row['BusName'] || '',
          boardingPoint: row['Boarding point'] || row['BoardingPoint'] || '',
          time: row['Time'] || ''
        };
      } else if (type === 'fees') {

        const currentPaid = student.fees?.paidFees || 0;
        let total = Number(row['Total Fees']) || student.fees?.totalFees || 0;
        let paid = 'Paid Fees' in row ? Number(row['Paid Fees']) || 0 : currentPaid;
        let pending = 0;

        // Make key matching case-insensitive and trim spaces for robustness
        const rowKeys = Object.keys(row);
        const findKey = (searchStr) => rowKeys.find(k => k.toLowerCase().trim() === searchStr.toLowerCase());

        const totalBalanceKey = findKey('Total balance');
        const collegeFeeKey = findKey('Tution Fee') || findKey('College Fee') || findKey('Tuition Fee');
        const hostelFeeKey = findKey('Hostel Fee');
        const busFeeKey = findKey('Bus Fee') || findKey('Transportation Fee');
        const breakageFeeKey = findKey('Common Breakage Fee');

        const collegeFee = collegeFeeKey ? Number(row[collegeFeeKey]) || 0 : student.fees?.collegeFee || 0;
        const hostelFee = hostelFeeKey ? Number(row[hostelFeeKey]) || 0 : student.fees?.hostelFee || 0;
        const transportationFee = busFeeKey ? Number(row[busFeeKey]) || 0 : student.fees?.transportationFee || 0;
        const breakageFee = breakageFeeKey ? Number(row[breakageFeeKey]) || 0 : student.fees?.breakageFee || 0;

        // If they provided "Total balance" directly (as in the screenshot)
        if (totalBalanceKey) {
          pending = Number(row[totalBalanceKey]) || 0;
          // Reverse calculate Total Fees to ensure math adds up when single payments are made later
          total = pending + paid;
        } else {
          // Fallback to calculating from individual components
          if ('College Fee' in row || 'Hostel Fee' in row || 'Transportation Fee' in row || 'Common Breakage Fee' in row || 'Tution Fee' in row || 'Bus Fee' in row) {
            total = collegeFee + hostelFee + transportationFee + breakageFee;
          }
          pending = Math.max(0, total - paid);
        }
        
        student.fees = { 
          totalFees: total, 
          paidFees: paid, 
          pendingFees: pending,
          collegeFee,
          hostelFee,
          transportationFee,
          breakageFee
        };
      }

      await student.save();
      success++;
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: `Successfully updated ${success} records.`, summary: { success, failed, errors } });

  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
};

exports.getFeeDefaulters = async (req, res) => {
  try {
    // Find all students where pendingFees > 0
    // Sort by highest pending fee first
    const defaulters = await Student.find({ 'fees.pendingFees': { $gt: 0 } })
      .select('regNumber name branch section phoneNumber fees')
      .sort({ 'fees.pendingFees': -1 });
    
    res.json(defaulters);
  } catch (error) {
    console.error('Error fetching fee defaulters:', error);
    res.status(500).json({ error: 'Failed to fetch fee defaulters' });
  }
};

exports.updateSingleFee = async (req, res) => {
  try {
    const { regNumber, amountPaid } = req.body;
    
    if (!regNumber || !amountPaid || isNaN(amountPaid)) {
      return res.status(400).json({ error: 'Valid Registration Number and Amount Paid are required.' });
    }

    const student = await Student.findOne({ regNumber: regNumber.toUpperCase().trim() });
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const currentPaid = student.fees?.paidFees || 0;
    const newPaid = currentPaid + Number(amountPaid);
    const totalFees = student.fees?.totalFees || 0;
    const newPending = Math.max(0, totalFees - newPaid);

    student.fees = {
      ...student.fees,
      paidFees: newPaid,
      pendingFees: newPending
    };

    await student.save();
    res.json({ message: 'Fee updated successfully', student });
  } catch (error) {
    console.error('Error updating single fee:', error);
    res.status(500).json({ error: 'Failed to update fee.' });
  }
};
