const express = require('express');
const router = express.Router();
const multer = require('multer');
const circularController = require('../controllers/circularController');
const { authMiddleware } = require('../middleware/auth');

// Configure multer for file upload
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.get('/', authMiddleware, circularController.getAllCirculars);
router.post('/', authMiddleware, circularController.createCircular);
router.post('/upload', authMiddleware, upload.single('file'), circularController.uploadFile);
router.post('/:id/send', authMiddleware, circularController.sendCircular);
router.post('/:id/resend', authMiddleware, circularController.resendCircular);
router.delete('/:id', authMiddleware, circularController.deleteCircular);

module.exports = router;
