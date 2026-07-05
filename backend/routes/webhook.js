const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Webhook verification
router.get('/', webhookController.verifyWebhook);

// Webhook message handler
router.post('/', webhookController.handleMessage);

module.exports = router;
