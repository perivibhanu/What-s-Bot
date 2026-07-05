const express = require('express');
const router = express.Router();
const multer = require('multer');
const studentController = require('../controllers/studentController');
const { authMiddleware } = require('../middleware/auth');

// Multer config for Excel/CSV import (stored as temp file)
const upload = multer({
  dest: 'uploads/imports/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                           // .xls
      'text/csv',                                                            // .csv
      'application/csv',
      'text/plain'                                                           // some CSVs
    ];
    if (allowed.includes(file.mimetype) ||
        file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed'));
    }
  }
});

// ── Bulk Import (MUST be before /:id routes) ────────────────────────────────
router.post('/import/bulk',    authMiddleware, upload.single('file'), studentController.bulkImportStudents);
router.get('/import/template', authMiddleware, studentController.downloadTemplate);

// ── Custom Endpoints ──────────────────────────────────────────────────────────
router.get('/batch-years', authMiddleware, studentController.getBatchYears);
router.delete('/bulk-delete/:batchYear', authMiddleware, studentController.bulkDeleteByBatch);

// ── Standard CRUD ─────────────────────────────────────────────────────────────
router.get('/',      authMiddleware, studentController.getAllStudents);
router.get('/:id',   authMiddleware, studentController.getStudentById);
router.post('/',     authMiddleware, studentController.createStudent);
router.put('/:id',   authMiddleware, studentController.updateStudent);
router.delete('/:id',authMiddleware, studentController.deleteStudent);

module.exports = router;
