const Timetable = require('../models/Timetable');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// Helper: determine file type from mimetype
const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype === 'application/msword' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'word';
  if (mimetype === 'application/vnd.ms-excel' || mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimetype === 'text/csv') return 'excel';
  return 'image';
};

const getRegNoRegex = (batch, branchCode) => {
  const shortBatch = String(batch).slice(-2); 
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

exports.downloadTemplate = async (req, res) => {
  try {
    const { batch, branch, section } = req.body;
    
    if (!batch || !branch || !section) {
      return res.status(400).json({ error: 'Batch, Branch, and Section are required' });
    }

    const branchCode = getBranchCode(branch);
    if (!branchCode) {
      return res.status(400).json({ error: `Unknown branch code for ${branch}` });
    }

    const regex = getRegNoRegex(batch, branchCode);
    const Student = require('../models/Student');

    // Find students matching this cohort
    const students = await Student.find({
      regNumber: regex,
      section: new RegExp(`^${section}$`, 'i')
    }).sort({ regNumber: 1 });

    if (students.length === 0) {
      return res.status(404).json({ 
        error: `No students found for ${branch} Batch ${batch} Section ${section}. Make sure they are imported first.` 
      });
    }

    // Build template data
    const templateData = students.map(s => {
      return {
        'Registration Number': s.regNumber,
        'Name': s.name,
        'Room': '',
        'Seat': ''
      };
    });

    const xlsx = require('xlsx');
    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();

    // Set column widths
    const cols = [ { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 } ];
    worksheet['!cols'] = cols;

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Seating');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=${branch}_${batch}_Sec${section}_SeatingTemplate.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    res.status(500).json({ error: 'Failed to generate template: ' + error.message });
  }
};

exports.uploadTimetable = async (req, res) => {
  const imageFile = req.files && req.files.image ? req.files.image[0] : null;

  if (!imageFile) {
    return res.status(400).json({ error: 'No timetable file uploaded' });
  }

  const { batch, branch, section, title, description } = req.body;

  if (!batch || !branch || !section) {
    fs.unlinkSync(imageFile.path);
    return res.status(400).json({ error: 'Batch, Branch, and Section are required' });
  }

  const fileType = getFileType(imageFile.mimetype);
  
  const originalName = imageFile.originalname || 'timetable';

  let seatingDetails = [];

  try {
    // 0. Excel parsing for seating details has been removed per user request.
    // The uploaded file will just be sent directly to students.

    // 1. Upload file to Cloudinary
    const uploadOptions = {
      folder: 'vcet/timetables',
    };

    // For PDF and Word files, use raw resource type so Cloudinary doesn't convert them to images
    if (fileType !== 'image') {
      uploadOptions.resource_type = 'raw';
      
      // Ensure the extension is part of the public_id so WhatsApp identifies the file type
      if (originalName.includes('.')) {
        const ext = originalName.split('.').pop();
        const baseName = originalName.substring(0, originalName.lastIndexOf('.')).replace(/[^a-zA-Z0-9]/g, '_');
        uploadOptions.public_id = `${baseName}_${Date.now()}.${ext}`;
      } else {
        uploadOptions.public_id = `timetable_${Date.now()}`;
      }
    }

    const result = await cloudinary.uploader.upload(imageFile.path, uploadOptions);

    fs.unlinkSync(imageFile.path); // Remove local file

    // 2. Check if a timetable already exists for this class
    const existing = await Timetable.findOne({ batch, branch, section });

    if (existing) {
      // Delete old file from Cloudinary
      try {
        const destroyOptions = existing.fileType !== 'image' ? { resource_type: 'raw' } : {};
        await cloudinary.uploader.destroy(existing.cloudinaryId, destroyOptions);
      } catch (err) {
        console.error('Failed to delete old timetable file:', err);
      }

      // Update document
      existing.imageUrl = result.secure_url;
      existing.cloudinaryId = result.public_id;
      existing.fileType = fileType;
      existing.fileName = originalName;
      existing.title = title || existing.title;
      existing.description = description || existing.description;
      if (seatingDetails.length > 0) {
        existing.seatingDetails = seatingDetails;
      }
      await existing.save();
      
      return res.json({ message: 'Timetable updated successfully', timetable: existing });
    }

    // 3. Create new document
    const timetable = await Timetable.create({
      batch,
      branch,
      section,
      title,
      description,
      imageUrl: result.secure_url,
      cloudinaryId: result.public_id,
      fileType,
      fileName: originalName,
      seatingDetails
    });

    res.status(201).json({ message: 'Timetable uploaded successfully', timetable });
  } catch (error) {
    if (imageFile && fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);
    console.error('Timetable upload error:', error);
    res.status(500).json({ error: 'Failed to upload timetable', details: error.message });
  }
};

exports.getTimetable = async (req, res) => {
  const { batch, branch, section } = req.query;
  
  try {
    if (batch && branch && section) {
      const timetable = await Timetable.findOne({ batch, branch, section });
      return res.json(timetable);
    }
    
    // Admin view: get all
    const timetables = await Timetable.find().sort({ createdAt: -1 });
    res.json(timetables);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timetables', details: error.message });
  }
};

exports.sendTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });

    if (timetable.isSent) {
      return res.status(400).json({ error: 'Timetable already sent' });
    }

    const Student = require('../models/Student');
    const whatsappService = require('../services/whatsappService');

    // Find all students matching this class
    const query = {};
    if (timetable.batch !== 'ALL') {
      const shortBatch = String(timetable.batch).slice(-2);
      query.regNumber = new RegExp(`^\\d{4}${shortBatch}`);
    }
    if (timetable.branch !== 'ALL') query.branch = timetable.branch;
    if (timetable.section !== 'ALL') query.section = new RegExp(`^${timetable.section}$`, 'i');

    const students = await Student.find(query);

    let sentCount = 0;
    let registeredCount = 0;
    const sendPromises = students.map(async (student) => {
      if (student.phoneNumber && student.isRegistered) {
        registeredCount++;
        try {
          await whatsappService.sendTimetableMessage(student.phoneNumber, timetable, student);
          sentCount++;
        } catch (err) {
          console.error(`Failed to send timetable to ${student.phoneNumber}:`, err);
        }
      }
    });
    await Promise.all(sendPromises);

    timetable.isSent = true;
    await timetable.save();

    res.json({ 
      message: 'Timetable sent successfully', 
      sentCount, 
      matchedCount: students.length, 
      registeredCount 
    });
  } catch (error) {
    console.error('Send timetable error:', error);
    res.status(500).json({ error: 'Failed to send timetable' });
  }
};

exports.resendTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });

    const Student = require('../models/Student');
    const whatsappService = require('../services/whatsappService');

    const query = {};
    if (timetable.batch !== 'ALL') {
      const shortBatch = String(timetable.batch).slice(-2);
      query.regNumber = new RegExp(`^\\d{4}${shortBatch}`);
    }
    if (timetable.branch !== 'ALL') query.branch = timetable.branch;
    if (timetable.section !== 'ALL') query.section = new RegExp(`^${timetable.section}$`, 'i');

    const students = await Student.find(query);

    let sentCount = 0;
    let registeredCount = 0;
    const sendPromises = students.map(async (student) => {
      if (student.phoneNumber && student.isRegistered) {
        registeredCount++;
        try {
          await whatsappService.sendTimetableMessage(student.phoneNumber, timetable, student);
          sentCount++;
        } catch (err) {
          console.error(`Failed to send timetable to ${student.phoneNumber}:`, err);
        }
      }
    });
    await Promise.all(sendPromises);

    timetable.isSent = true;
    await timetable.save();

    res.json({ 
      message: 'Timetable resent successfully', 
      sentCount,
      matchedCount: students.length,
      registeredCount 
    });
  } catch (error) {
    console.error('Resend timetable error:', error);
    res.status(500).json({ error: 'Failed to resend timetable' });
  }
};

exports.deleteTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });

    // Delete from Cloudinary (use raw for non-image types)
    const destroyOptions = timetable.fileType !== 'image' ? { resource_type: 'raw' } : {};
    await cloudinary.uploader.destroy(timetable.cloudinaryId, destroyOptions);

    // Delete from DB
    await Timetable.findByIdAndDelete(req.params.id);

    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete timetable' });
  }
};
