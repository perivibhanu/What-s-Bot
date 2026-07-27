const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', driverController.getAllDrivers);
router.post('/', driverController.addDriver);
router.delete('/:id', driverController.deleteDriver);

module.exports = router;
