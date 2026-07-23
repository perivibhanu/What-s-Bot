const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { authMiddleware } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/dept-login', authController.deptLogin);
router.post('/register', authMiddleware, authController.register);

module.exports = router;
