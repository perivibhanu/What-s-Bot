const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, attendanceController.getAttendanceRecords);
router.post('/send-alerts', authMiddleware, attendanceController.sendAlerts);

module.exports = router;
