const StaffMessage = require('../models/StaffMessage');
const Staff = require('../models/Staff');
const whatsappService = require('../services/whatsappService');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// ─── Helper: Normalize phone number ───────────────────────────────────────────
const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, ''); // remove non-digits
  if (digits.length === 10) return '91' + digits;                          // 9876543210 → 91...
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1); // 09876... → 91...
  return digits; // already has country code or is invalid
};

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
  const resourceType = isImage ? 'image' : 'raw';

  const cleanName = originalName
    .replace(/\.[^/.]+$/, '')          // remove extension
    .replace(/\s+/g, '_')             // spaces → underscores
    .replace(/[^a-zA-Z0-9_-]/g, '')   // remove special chars
    .substring(0, 50);                 // max 50 chars

  const timestamp = Date.now();
  const publicId = `staff_messages/${cleanName}_${timestamp}`;

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: resourceType,
    public_id: publicId,
    folder: 'vcet_staff_messages',
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

// ─── GET all staff messages ───────────────────────────────────────────────────
exports.getAllMessages = async (req, res) => {
  try {
    let query = {};
    if (req.role === 'dept_admin') {
      query.targetDepartment = req.dept;
    }
    const messages = await StaffMessage.find(query).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── POST create a new staff message draft ───────────────────────────────────
exports.createMessage = async (req, res) => {
  try {
    const { title, message, fileUrl, fileName, fileType, cloudinaryPublicId } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    const newMessageData = {
      title,
      message,
      status: 'draft',
      sentBy: req.role === 'dept_admin' ? `${req.dept} HOD` : 'Principal',
      targetDepartment: req.role === 'dept_admin' ? req.dept : undefined
    };

    if (fileUrl) newMessageData.fileUrl = fileUrl;
    if (fileName) newMessageData.fileName = fileName;
    if (fileType) newMessageData.fileType = fileType;
    if (cloudinaryPublicId) newMessageData.cloudinaryPublicId = cloudinaryPublicId;

    const newMessage = await StaffMessage.create(newMessageData);

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── POST upload file to Cloudinary ──────────────────────────────────────────
exports.uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { mimetype, originalname, path: filePath, size } = req.file;

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  if (size > MAX_SIZE) {
    cleanupTempFile(filePath);
    return res.status(400).json({ error: 'File too large. Maximum allowed size is 10 MB.' });
  }

  const isImage = mimetype.startsWith('image/');
  const fileType = isImage ? 'image' : 'document';

  try {
    let fileUrl;
    let cloudinaryPublicId = null;

    if (isCloudinaryConfigured()) {
      console.log(`📤 Uploading "${originalname}" to Cloudinary...`);
      const uploadResult = await uploadToCloudinary(filePath, mimetype, originalname);
      fileUrl = uploadResult.fileUrl;
      cloudinaryPublicId = uploadResult.publicId;
      console.log(`✅ Cloudinary upload success: ${fileUrl}`);
      cleanupTempFile(filePath);
    } else {
      console.warn('⚠️  Cloudinary not configured — using local file storage.');
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    res.json({
      fileUrl,
      fileName: originalname,
      fileType,
      cloudinaryPublicId
    });
  } catch (error) {
    cleanupTempFile(filePath);
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: 'File upload failed: ' + error.message });
  }
};

// ─── Helper: resolve recipients ───────────────────────────────────────────────
const resolveStaffRecipients = async (audience, department) => {
  let query = {};
  if (audience !== 'all') {
    query.type = audience;
  }
  if (department) {
    query.department = department;
  }

  const staffMembers = await Staff.find(query);
  let recipients = [];
  staffMembers.forEach(s => {
    const phone = normalizePhone(s.contactDetails);
    if (phone.length >= 10) recipients.push(phone);
  });
  return [...new Set(recipients)];
};

// ─── Helper: send message payload to phone ───────────────────────────────────
const sendToPhone = async (phone, msg) => {
  let caption = `📢 *${msg.title}*\n\n${msg.message}`;
  let payload;

  if (msg.fileUrl) {
    if (msg.fileType === 'image') {
      payload = {
        messaging_product: 'whatsapp',
        type: 'image',
        image: { link: msg.fileUrl, caption: caption }
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        type: 'document',
        document: { link: msg.fileUrl, caption: caption, filename: msg.fileName }
      };
    }
  } else {
    payload = {
      messaging_product: 'whatsapp',
      type: 'text',
      text: { body: caption }
    };
  }

  // Send the raw payload using the whatsappService generic sendMessage
  return whatsappService.sendMessage(phone, payload);
};

// ─── POST send a draft message ────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const msg = await StaffMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.status === 'sent') return res.status(400).json({ error: 'Message already sent' });

    // Validate permission for HOD role
    if (req.role === 'dept_admin' && msg.targetDepartment !== req.dept) {
      return res.status(403).json({ error: 'Unauthorized to send this message' });
    }

    const { targetAudience = 'all', isAll = true, targetDepartment } = req.body;
    
    // For HOD, force the department filter to their department
    const effectiveDept = req.role === 'dept_admin' ? req.dept : (isAll ? null : targetDepartment);

    const recipients = await resolveStaffRecipients(targetAudience, effectiveDept);

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients found for the selected targeting options.' });
    }

    console.log(`📢 Sending staff message "${msg.title}" to ${recipients.length} recipients...`);

    let successCount = 0;
    let failedCount = 0;

    for (const phone of recipients) {
      try {
        await sendToPhone(phone, msg);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        failedCount++;
        console.error(`❌ Failed to send to ${phone}:`, error.message);
      }
    }

    msg.status = 'sent';
    msg.targetAudience = targetAudience;
    msg.targetDepartment = effectiveDept;
    msg.recipientCount = successCount;
    msg.sentAt = new Date();
    await msg.save();

    res.json({
      message: `Message sent to ${successCount} out of ${recipients.length} recipients`,
      staffMessage: msg,
      stats: { total: recipients.length, success: successCount, failed: failedCount }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── POST re-send a message ───────────────────────────────────────────────────
exports.resendMessage = async (req, res) => {
  try {
    const msg = await StaffMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.status !== 'sent') return res.status(400).json({ error: 'Message not sent yet' });

    // Validate permission for HOD role
    if (req.role === 'dept_admin' && msg.targetDepartment !== req.dept) {
      return res.status(403).json({ error: 'Unauthorized to re-send this message' });
    }

    const recipients = await resolveStaffRecipients(msg.targetAudience, msg.targetDepartment);

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients found' });
    }

    let successCount = 0;
    let failedCount = 0;

    for (const phone of recipients) {
      try {
        await sendToPhone(phone, msg);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        failedCount++;
      }
    }

    msg.recipientCount = successCount;
    msg.sentAt = new Date();
    await msg.save();

    res.json({
      message: `Message re-sent to ${successCount} out of ${recipients.length} recipients`,
      staffMessage: msg,
      stats: { total: recipients.length, success: successCount, failed: failedCount }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── DELETE staff message history ─────────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  try {
    const msg = await StaffMessage.findById(req.params.id);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Validate permission for HOD role
    if (req.role === 'dept_admin' && msg.targetDepartment !== req.dept) {
      return res.status(403).json({ error: 'Unauthorized to delete this message' });
    }

    // Delete file from Cloudinary if it exists
    if (msg.cloudinaryPublicId && isCloudinaryConfigured()) {
      try {
        await cloudinary.uploader.destroy(msg.cloudinaryPublicId, {
          resource_type: msg.fileType === 'image' ? 'image' : 'raw'
        });
      } catch (cloudErr) {
        console.warn('⚠️ Failed to delete file from Cloudinary:', cloudErr.message);
      }
    }

    await StaffMessage.findByIdAndDelete(req.params.id);
    res.json({ message: 'Message history deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
