const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Temp local storage before Cloudinary
const staffMessageController = require('../controllers/staffMessageController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, staffMessageController.getAllMessages);
router.post('/', authMiddleware, staffMessageController.createMessage);
router.post('/upload', authMiddleware, upload.single('file'), staffMessageController.uploadFile);
router.post('/:id/send', authMiddleware, staffMessageController.sendMessage);
router.post('/:id/resend', authMiddleware, staffMessageController.resendMessage);
router.delete('/:id', authMiddleware, staffMessageController.deleteMessage);

module.exports = router;
