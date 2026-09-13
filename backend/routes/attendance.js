const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, isDeptAdminOrMainAdmin } = require('../middleware/auth');

router.get('/', verifyToken, isDeptAdminOrMainAdmin, attendanceController.getAttendanceRecords);

module.exports = router;
