const express = require('express');
const router = express.Router();
const multer = require('multer');
const collegeMediaController = require('../controllers/collegeMediaController');
const { authMiddleware } = require('../middleware/auth');

// Configure multer — allow images and videos up to 50 MB
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

// Public (used by bot internally via service, no token needed)
router.get('/', collegeMediaController.getAllTopics);
router.get('/:topic', collegeMediaController.getTopic);

// Admin-protected
router.put('/:topic', authMiddleware, collegeMediaController.updateTopic);
router.post('/:topic/upload', authMiddleware, upload.single('file'), collegeMediaController.uploadMedia);
router.delete('/:topic/media/:mediaId', authMiddleware, collegeMediaController.deleteMedia);

module.exports = router;
