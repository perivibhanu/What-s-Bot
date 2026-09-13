const express = require('express');
const router = express.Router();
const webhookFlowController = require('../controllers/webhookFlowController');

// Meta requires POST for flow endpoints
router.post('/', webhookFlowController.handleFlowEndpoint);

module.exports = router;
