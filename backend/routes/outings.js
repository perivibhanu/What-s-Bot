const express = require('express');
const router = express.Router();
const outingController = require('../controllers/outingController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/active', outingController.getActiveOutings);
router.get('/late', outingController.getLateComers);
router.post('/scan', outingController.scanGateQR);

module.exports = router;
