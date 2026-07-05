const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');

// Stats must come before /:id to avoid conflict
router.get('/stats', admissionController.getStats);
router.get('/export', admissionController.exportCSV);
router.get('/', admissionController.getAll);
router.post('/', admissionController.create);
router.get('/:id', admissionController.getById);
router.patch('/:id/status', admissionController.updateStatus);
router.delete('/:id', admissionController.deleteApplication);

module.exports = router;
