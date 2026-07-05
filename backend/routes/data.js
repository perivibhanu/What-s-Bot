const express = require('express');
const router = express.Router();
const multer = require('multer');
const dataController = require('../controllers/dataController');
const { authMiddleware } = require('../middleware/auth');

const upload = multer({
  dest: 'uploads/data/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls|csv)$/i)) cb(null, true);
    else cb(new Error('Only Excel and CSV files are allowed'));
  }
});

router.post('/template', authMiddleware, dataController.downloadDataTemplate);
router.post('/upload', authMiddleware, upload.single('file'), dataController.uploadData);
router.get('/fee-defaulters', authMiddleware, dataController.getFeeDefaulters);
router.post('/update-single-fee', authMiddleware, dataController.updateSingleFee);

module.exports = router;
