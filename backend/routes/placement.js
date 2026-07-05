const express = require('express');
const router = express.Router();
const placementController = require('../controllers/placementController');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for temp file storage
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Since Dept Admins manage placements, we allow 'super_admin' and 'dept_admin'
// but usually it's just 'dept_admin'. We will use verifyToken and we can let both access it.
router.use(authMiddleware);

router.get('/', placementController.getMaterials);
router.post('/upload', upload.fields([{ name: 'image', maxCount: 1 }]), placementController.uploadMaterial);
router.post('/:id/send', placementController.sendMaterial);
router.post('/:id/resend', placementController.resendMaterial);
router.delete('/:id', placementController.deleteMaterial);

module.exports = router;
