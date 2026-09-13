const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, attendanceController.getAttendanceRecords);

module.exports = router;
