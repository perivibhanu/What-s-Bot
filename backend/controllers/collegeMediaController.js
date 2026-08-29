const CollegeMedia = require('../models/CollegeMedia');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// ─── Default topic definitions ─────────────────────────────────────────────────
const DEFAULT_TOPICS = [
  { topic: 'intro',              title: 'About College',        emoji: '🏫', order: 0 },
  { topic: 'admin_details',      title: 'Admin Contacts',       emoji: '📞', order: 1 },
  // ── Sub-departments ──────────────────────────────────────────────────────────
  { topic: 'dept_aids',          title: 'AIDS',                 emoji: '🤖', order: 2 },
  { topic: 'dept_cse',           title: 'CSE',                  emoji: '💻', order: 3 },
  { topic: 'dept_ece',           title: 'ECE',                  emoji: '📡', order: 4 },
  { topic: 'dept_ee',            title: 'EEE',                  emoji: '⚡', order: 5 },
  { topic: 'dept_it',            title: 'IT',                   emoji: '🌐', order: 6 },
  { topic: 'dept_mech',          title: 'Mechanical',           emoji: '⚙️', order: 7 },
  { topic: 'dept_mechatronics',  title: 'Mechatronics',         emoji: '🦾', order: 8 },
  // ── Other main topics ────────────────────────────────────────────────────────
  { topic: 'placements',         title: 'Placements',           emoji: '💼', order: 9  },
  { topic: 'projects',           title: 'Projects',             emoji: '🔬', order: 10 },
  { topic: 'academics',          title: 'Academics',            emoji: '📚', order: 11 },
  { topic: 'achievements',       title: 'Achievements',         emoji: '🏆', order: 12 },
  { topic: 'hostel',             title: 'Hostel',               emoji: '🏠', order: 13 },
  { topic: 'transportation',     title: 'Transportation',       emoji: '🚌', order: 14 },
  { topic: 'sports',             title: 'Sports',               emoji: '⚽', order: 15 },
  { topic: 'hospital',           title: 'Hospital',             emoji: '🏥', order: 16 },
  { topic: 'hostelFood',         title: 'Hostel Food',          emoji: '🍽️', order: 17 },
];

const depts = ['aids', 'cse', 'ece', 'ee', 'it', 'mech', 'mechatronics'];
const deptSubtopics = [
  { id: 'placements', title: 'Placements', emoji: '💼' },
  { id: 'achievements', title: 'Achievements', emoji: '🏆' },
  { id: 'sports', title: 'Sports', emoji: '⚽' },
  { id: 'industrial_visit', title: 'Industrial Visit', emoji: '🏭' },
  { id: 'projects', title: 'Projects', emoji: '🔬' },
  { id: 'academics', title: 'Academics', emoji: '📚' }
];

let currentOrder = 18;
depts.forEach(dept => {
  deptSubtopics.forEach(sub => {
    DEFAULT_TOPICS.push({
      topic: `dept_${dept}_${sub.id}`,
      title: `${dept.toUpperCase()} ${sub.title}`,
      emoji: sub.emoji,
      order: currentOrder++
    });
  });
});

// ─── Helper: Check if Cloudinary is configured ────────────────────────────────
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

// ─── Helper: Cleanup temp file ────────────────────────────────────────────────
const cleanupTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.warn('Could not delete temp file:', err.message);
  }
};

const getTopicKey = (branch) => {
  const map = {
    'AIDS': 'dept_aids',
    'CSE': 'dept_cse',
    'ECE': 'dept_ece',
    'EEE': 'dept_ee',
    'IT': 'dept_it',
    'Mechanical': 'dept_mech',
    'Mechatronics': 'dept_mechatronics'
  };
  return map[branch] || `dept_${branch.toLowerCase()}`;
};

// ─── Seed default topics if they don't exist ─────────────────────────────────
const seedDefaultTopics = async () => {
  for (const def of DEFAULT_TOPICS) {
    const exists = await CollegeMedia.findOne({ topic: def.topic });
    if (!exists) {
      await CollegeMedia.create({ ...def, mediaItems: [] });
    }
  }
};

// ─── GET all college media topics ────────────────────────────────────────────
exports.getAllTopics = async (req, res) => {
  try {
    await seedDefaultTopics();
    const topics = await CollegeMedia.find().sort({ order: 1 });
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── GET single topic ─────────────────────────────────────────────────────────
exports.getTopic = async (req, res) => {
  try {
    const topic = await CollegeMedia.findOne({ topic: req.params.topic });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── PUT update topic metadata (title, description, introVideoUrl) ─────────────
exports.updateTopic = async (req, res) => {
  try {
    if (req.role === 'dept_admin') {
      const expectedTopicPrefix = getTopicKey(req.dept);
      if (req.params.topic !== expectedTopicPrefix && !req.params.topic.startsWith(expectedTopicPrefix + '_')) {
        return res.status(403).json({ error: "Not authorized to modify this department's media." });
      }
    }

    const { title, description, introVideoUrl, isActive } = req.body;
    const topic = await CollegeMedia.findOne({ topic: req.params.topic });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    if (title !== undefined)         topic.title = title;
    if (description !== undefined)   topic.description = description;
    if (introVideoUrl !== undefined)  topic.introVideoUrl = introVideoUrl;
    if (isActive !== undefined)       topic.isActive = isActive;

    await topic.save();
    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── POST upload media file for a topic ───────────────────────────────────────
exports.uploadMedia = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  if (req.role === 'dept_admin') {
    const expectedTopicPrefix = getTopicKey(req.dept);
    if (req.params.topic !== expectedTopicPrefix && !req.params.topic.startsWith(expectedTopicPrefix + '_')) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: "Not authorized to modify this department's media." });
    }
  }

  const { mimetype, originalname, path: filePath, size } = req.file;
  const { caption = '', mediaType } = req.body;

  // 50 MB max
  const MAX_SIZE = 50 * 1024 * 1024;
  if (size > MAX_SIZE) {
    cleanupTempFile(filePath);
    return res.status(400).json({ error: 'File too large. Maximum allowed size is 50 MB.' });
  }

  const isImage = mimetype.startsWith('image/');
  const isVideo = mimetype.startsWith('video/');

  if (!isImage && !isVideo) {
    cleanupTempFile(filePath);
    return res.status(400).json({ error: 'Only image and video files are allowed.' });
  }

  const detectedType = isVideo ? 'video' : 'image';

  try {
    let fileUrl;

    if (isCloudinaryConfigured()) {
      const resourceType = isVideo ? 'video' : 'image';
      const cleanName = originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .substring(0, 50);

      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: resourceType,
        public_id: `college_media/${req.params.topic}/${cleanName}_${Date.now()}`,
        folder: 'vcet_college_media',
      });

      fileUrl = result.secure_url;
      cleanupTempFile(filePath);
      console.log(`✅ Cloudinary upload success: ${fileUrl}`);
    } else {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    // Append to topic's mediaItems or set as introVideoUrl
    const topic = await CollegeMedia.findOne({ topic: req.params.topic });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    if (req.body.isIntroVideo === 'true') {
      topic.introVideoUrl = fileUrl;
    } else {
      topic.mediaItems.push({ type: detectedType, url: fileUrl, caption });
    }
    
    await topic.save();

    res.json({ message: 'Media uploaded successfully', topic, fileUrl, type: detectedType });
  } catch (error) {
    cleanupTempFile(filePath);
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── DELETE specific media item from a topic ──────────────────────────────────
exports.deleteMedia = async (req, res) => {
  try {
    if (req.role === 'dept_admin') {
      const expectedTopicPrefix = getTopicKey(req.dept);
      if (req.params.topic !== expectedTopicPrefix && !req.params.topic.startsWith(expectedTopicPrefix + '_')) {
        return res.status(403).json({ error: "Not authorized to modify this department's media." });
      }
    }

    const { topic: topicName, mediaId } = req.params;
    const topic = await CollegeMedia.findOne({ topic: topicName });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const initialLength = topic.mediaItems.length;
    topic.mediaItems = topic.mediaItems.filter(item => String(item._id) !== mediaId);

    if (topic.mediaItems.length === initialLength) {
      return res.status(404).json({ error: 'Media item not found' });
    }

    await topic.save();
    res.json({ message: 'Media item deleted successfully', topic });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
