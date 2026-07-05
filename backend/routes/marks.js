const express = require('express');
const router = express.Router();
const multer = require('multer');
const marksController = require('../controllers/marksController');
const { authMiddleware } = require('../middleware/auth');

// Multer config for Excel import
const upload = multer({
  dest: 'uploads/marks/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                           // .xls
      'text/csv'                                                             // .csv
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed'));
    }
  }
});

router.post('/template', authMiddleware, marksController.downloadTemplate);
router.post('/upload', authMiddleware, upload.single('file'), marksController.uploadMarks);
router.post('/clear', authMiddleware, marksController.clearMarks);

module.exports = router;
