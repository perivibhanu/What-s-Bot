const express = require('express');
const router = express.Router();
const wardenController = require('../controllers/wardenController');
const { authMiddleware } = require('../middleware/auth'); 

// Apply auth middleware to all routes if needed. 
router.use(authMiddleware);

router.get('/', wardenController.getAllWardens);
router.post('/', wardenController.createWarden);
router.put('/:id', wardenController.updateWarden);
router.delete('/:id', wardenController.deleteWarden);

module.exports = router;
