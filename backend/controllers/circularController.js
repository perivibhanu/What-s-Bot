const Circular = require('../models/Circular');
const Student = require('../models/Student');
const whatsappService = require('../services/whatsappService');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// ─── Helper: Check if Cloudinary is configured ───────────────────────────────
const isCloudinaryConfigured = () => {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'your_api_secret'
  );
};

// ─── Helper: Upload file to Cloudinary ───────────────────────────────────────
const uploadToCloudinary = async (filePath, mimeType, originalName) => {
  const isImage = mimeType.startsWith('image/');

  // Cloudinary resource type:
  //   'image'  → jpg, png, gif, webp
  //   'raw'    → pdf, doc, docx (non-image files)
  const resourceType = isImage ? 'image' : 'raw';

  // Clean file name for public_id (remove extension, spaces → underscores)
  const cleanName = originalName
    .replace(/\.[^/.]+$/, '')          // remove extension
    .replace(/\s+/g, '_')             // spaces → underscores
    .replace(/[^a-zA-Z0-9_-]/g, '')   // remove special chars
    .substring(0, 50);                 // max 50 chars

  const timestamp = Date.now();
  const publicId = `circulars/${cleanName}_${timestamp}`;

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: resourceType,
    public_id: publicId,
    folder: 'vcet_circulars',
    // For PDFs - generate a preview page image (useful for thumbnails)
    ...(mimeType === 'application/pdf' && {
      format: 'pdf',
      pages: true
    })
  });

  return {
    fileUrl: result.secure_url,
    publicId: result.public_id,
    resourceType
  };
};

// ─── Helper: Cleanup temp file ────────────────────────────────────────────────
const cleanupTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('Could not delete temp file:', filePath, err.message);
  }
};

// ─── GET all circulars ────────────────────────────────────────────────────────
exports.getAllCirculars = async (req, res) => {
  try {
    const { type, department } = req.query;
    let query = {};
    if (type) query.type = type;
    if (department) query.department = department;

    const circulars = await Circular.find(query).sort({ createdAt: -1 });
    res.json(circulars);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── POST create circular (metadata only, file uploaded separately) ───────────
exports.createCircular = async (req, res) => {
  try {
    const { title, description, fileUrl, fileName, fileType, cloudinaryPublicId, type, department } = req.body;

    if (!title || !fileUrl || !fileName) {
      return res.status(400).json({ error: 'Title, fileUrl, and fileName are required' });
    }

    const circular = await Circular.create({
      title,
      description: description || '',
      fileUrl,
      fileName,
      fileType: fileType || 'document',
      cloudinaryPublicId: cloudinaryPublicId || null,
      type: type || 'principal',
      department: department || null,
      status: 'draft'
    });

    res.status(201).json(circular);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ─── POST upload file to Cloudinary (or local fallback) ──────────────────────
exports.uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { mimetype, originalname, path: filePath, size } = req.file;

  // File size check (10 MB max)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (size > MAX_SIZE) {
    cleanupTempFile(filePath);
    return res.status(400).json({ error: 'File too large. Maximum allowed size is 10 MB.' });
  }

  // Determine file type category
  const isImage = mimetype.startsWith('image/');
  const isPdf = mimetype === 'application/pdf';
  const isWord =
    mimetype === 'application/msword' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isExcel =
    mimetype === 'application/vnd.ms-excel' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (!isImage && !isPdf && !isWord && !isExcel) {
    cleanupTempFile(filePath);
    return res.status(400).json({
      error: 'Invalid file type. Only PDF, Word documents (DOC/DOCX), Excel files (XLS/XLSX), and images (JPG, PNG, GIF) are allowed.'
    });
  }

  const fileType = isImage ? 'image' : 'document';

  try {
    let fileUrl;
    let cloudinaryPublicId = null;
    let uploadedTo = 'local';

    if (isCloudinaryConfigured()) {
      // ── Upload to Cloudinary ──────────────────────────────────────────────
      console.log(`📤 Uploading "${originalname}" to Cloudinary...`);

      const uploadResult = await uploadToCloudinary(filePath, mimetype, originalname);
      fileUrl = uploadResult.fileUrl;
      cloudinaryPublicId = uploadResult.publicId;
      uploadedTo = 'cloudinary';

      console.log(`✅ Cloudinary upload success: ${fileUrl}`);

      // Delete the local temp file after successful Cloudinary upload
      cleanupTempFile(filePath);
    } else {
      // ── Fallback: local storage ───────────────────────────────────────────
      console.warn('⚠️  Cloudinary not configured — using local file storage.');
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    res.json({
      fileUrl,
      fileName: originalname,
      fileType,
      cloudinaryPublicId,
      uploadedTo,
      message: uploadedTo === 'cloudinary'
        ? '✅ File uploaded to Cloudinary successfully'
        : '⚠️ File saved locally (Cloudinary not configured)'
    });
  } catch (error) {
    // Clean up temp file on error
    cleanupTempFile(filePath);

    console.error('❌ Upload error:', error);

    // Provide a helpful error message for common Cloudinary errors
    let userMessage = 'File upload failed';
    if (error.message?.includes('Must supply api_key')) {
      userMessage = 'Cloudinary API key is missing or invalid. Check your .env file.';
    } else if (error.message?.includes('Invalid Signature')) {
      userMessage = 'Cloudinary API secret is invalid. Check your .env file.';
    } else if (error.message?.includes('cloud_name')) {
      userMessage = 'Cloudinary cloud name is invalid. Check your .env file.';
    } else {
      userMessage = error.message;
    }

    res.status(500).json({ error: userMessage });
  }
};

const Staff = require('../models/Staff');

// ─── Helper: Normalize phone number ───────────────────────────────────────────
const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, ''); // remove non-digits
  if (digits.length === 10) return '91' + digits;                          // 9876543210 → 91...
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1); // 09876... → 91...
  return digits; // already has country code or is invalid
};

// ─── Helper: Resolve Recipients ───────────────────────────────────────────────
const resolveRecipients = async (audience, isAll, batch, department, section, isHod) => {
  let recipients = [];

  if (audience === 'students' || audience === 'all' || audience === 'parents') {
    let query = {
      isRegistered: true,
      phoneNumber: { $exists: true, $ne: '' }
    };
    if (audience === 'parents') {
      query = {
        isRegistered: true,
        parentPhoneNumber: { $exists: true, $ne: '' }
      };
    }
    if (isHod && department) {
      if (Array.isArray(department) && department.length > 0) {
        query.branch = { $in: department };
      } else {
        query.branch = department;
      }
    } else if (!isAll) {
      if (department && department.length > 0) {
        query.branch = Array.isArray(department) ? { $in: department } : department;
      }
      if (section && section.length > 0) {
        if (Array.isArray(section)) {
          query.section = { $in: section.map(s => new RegExp(`^${s}$`, 'i')) };
        } else {
          query.section = new RegExp(`^${section}$`, 'i');
        }
      }
      if (batch) query.regNumber = { $regex: `^..${batch}`, $options: 'i' };
    }
    const students = await Student.find(query);
    if (audience === 'parents') {
      recipients = recipients.concat(students.map(s => s.parentPhoneNumber));
    } else {
      recipients = recipients.concat(students.map(s => s.phoneNumber));
    }
  }

  if (audience === 'teaching' || audience === 'lab_assistant') {
    let query = { type: audience };
    if (!isAll && department && department.length > 0) {
      query.department = Array.isArray(department) ? { $in: department } : department;
    }
    const staff = await Staff.find(query);
    // Filter out valid phone numbers from contact details
    staff.forEach(s => {
      const phone = normalizePhone(s.contactDetails);
      if (phone.length >= 10) recipients.push(phone);
    });
  }

  return [...new Set(recipients)]; // Remove duplicates
};

// ─── POST send circular ───────────────────────────────────────────────────────
exports.sendCircular = async (req, res) => {
  try {
    const circular = await Circular.findById(req.params.id);
    if (!circular) {
      return res.status(404).json({ error: 'Circular not found' });
    }

    if (circular.status === 'sent') {
      return res.status(400).json({ error: 'This circular has already been sent' });
    }

    const { audience = 'students', isAll = true, batch, department, section } = req.body;
    
    const isHod = circular.type === 'hod' || circular.type === 'parent_hod';
    // If it's an HOD circular, the target department is whatever the HOD selected (from 'department' array).
    // The default was to force circular.department, but now they can broadcast to multiple depts if they want,
    // though the frontend typically restricts or defaults this. Let's just use what's passed in the payload.
    const effectiveDept = (isHod && (!department || department.length === 0)) ? [circular.department] : department;

    const phoneNumbers = await resolveRecipients(audience, isAll, batch, effectiveDept, section, isHod);

    if (phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'No recipients found for the selected targeting options' });
    }

    console.log(`📢 Sending circular "${circular.title}" to ${phoneNumbers.length} recipients...`);

    let successCount = 0;
    let failedCount = 0;

    for (const phone of phoneNumbers) {
      try {
        await whatsappService.sendCircular(phone, circular);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        failedCount++;
        console.error(`❌ Failed to send to ${phone}:`, error.message);
      }
    }

    // Update circular status and targeting history
    circular.status = 'sent';
    circular.recipientCount = successCount;
    circular.sentAt = new Date();
    circular.targetAudience = audience;
    if (!isAll) {
      circular.targetBatch = batch;
      circular.targetDepartment = Array.isArray(effectiveDept) ? effectiveDept : [effectiveDept].filter(Boolean);
      circular.targetSection = Array.isArray(section) ? section : [section].filter(Boolean);
    }
    await circular.save();

    res.json({
      message: `Circular sent to ${successCount} out of ${phoneNumbers.length} recipients`,
      circular,
      stats: { total: phoneNumbers.length, success: successCount, failed: failedCount }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── POST re-send circular ────────────────────────────────────────────────────
exports.resendCircular = async (req, res) => {
  try {
    const circular = await Circular.findById(req.params.id);
    if (!circular) {
      return res.status(404).json({ error: 'Circular not found' });
    }

    if (circular.status !== 'sent') {
      return res.status(400).json({ error: 'This circular has not been sent yet. Use the send option instead.' });
    }

    const isHod = circular.type === 'hod';
    const isAll = !circular.targetBatch && (!circular.targetDepartment || circular.targetDepartment.length === 0) && (!circular.targetSection || circular.targetSection.length === 0);
    
    const phoneNumbers = await resolveRecipients(
      circular.targetAudience || 'students', 
      isAll, 
      circular.targetBatch, 
      circular.targetDepartment, 
      circular.targetSection, 
      isHod
    );

    if (phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'No recipients found to resend to' });
    }

    console.log(`🔄 Re-sending circular "${circular.title}" to ${phoneNumbers.length} recipients...`);

    let successCount = 0;
    let failedCount = 0;

    for (const phone of phoneNumbers) {
      try {
        await whatsappService.sendCircular(phone, circular);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        failedCount++;
        console.error(`❌ Failed to re-send to ${phone}:`, error.message);
      }
    }

    circular.recipientCount = successCount;
    circular.sentAt = new Date();
    await circular.save();

    res.json({
      message: `Circular re-sent to ${successCount} out of ${phoneNumbers.length} recipients`,
      circular,
      stats: { total: phoneNumbers.length, success: successCount, failed: failedCount }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── DELETE circular (also removes from Cloudinary if applicable) ─────────────
exports.deleteCircular = async (req, res) => {
  try {
    const circular = await Circular.findById(req.params.id);
    if (!circular) {
      return res.status(404).json({ error: 'Circular not found' });
    }

    // If file was uploaded to Cloudinary, delete it there too
    if (circular.cloudinaryPublicId && isCloudinaryConfigured()) {
      try {
        const resourceType = circular.fileType === 'image' ? 'image' : 'raw';
        await cloudinary.uploader.destroy(circular.cloudinaryPublicId, {
          resource_type: resourceType
        });
        console.log(`🗑️  Deleted from Cloudinary: ${circular.cloudinaryPublicId}`);
      } catch (cloudErr) {
        console.warn('Could not delete from Cloudinary:', cloudErr.message);
        // Don't fail the whole request just because Cloudinary delete failed
      }
    }

    await Circular.findByIdAndDelete(req.params.id);
    res.json({ message: 'Circular deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
