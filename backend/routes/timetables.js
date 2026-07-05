const express = require('express');
const router = express.Router();
const multer = require('multer');
const timetablesController = require('../controllers/timetablesController');
const { authMiddleware } = require('../middleware/auth');

// Multer config for file upload (images, PDF, Word, Excel)
const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
];

const upload = multer({
  dest: 'uploads/timetables/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image, PDF, Word, and Excel files are allowed'));
    }
  }
});

router.post('/template', authMiddleware, timetablesController.downloadTemplate);
router.post('/upload', authMiddleware, upload.fields([{ name: 'image', maxCount: 1 }]), timetablesController.uploadTimetable);
router.get('/', authMiddleware, timetablesController.getTimetable);
router.post('/:id/send', authMiddleware, timetablesController.sendTimetable);
router.post('/:id/resend', authMiddleware, timetablesController.resendTimetable);
router.delete('/:id', authMiddleware, timetablesController.deleteTimetable);

module.exports = router;
