const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/auth');

router.get('/settings', authMiddleware, adminController.getSettings);
router.put('/settings', authMiddleware, adminController.updateSettings);

module.exports = router;
