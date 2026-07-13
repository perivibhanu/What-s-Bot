const express = require('express');
const router = express.Router();
const wardenController = require('../controllers/wardenController');
const { requireAuth } = require('../middleware/auth'); // Assuming you have auth middleware

// Apply auth middleware to all routes if needed. 
// For now, let's assume requireAuth is the standard for admin routes.
router.use(requireAuth);

router.get('/', wardenController.getAllWardens);
router.post('/', wardenController.createWarden);
router.put('/:id', wardenController.updateWarden);
router.delete('/:id', wardenController.deleteWarden);

module.exports = router;
