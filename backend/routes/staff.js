const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for temp file storage
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Require authentication for all staff routes
router.use(authMiddleware);

router.get('/import/template', staffController.downloadTemplate);
router.post('/import/bulk', upload.single('file'), staffController.bulkImportStaff);

router.get('/', staffController.getStaff);
router.post('/', staffController.createStaff);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

module.exports = router;
