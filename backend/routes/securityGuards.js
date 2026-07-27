const express = require('express');
const router = express.Router();
const securityGuardController = require('../controllers/securityGuardController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', securityGuardController.getAllSecurityGuards);
router.post('/', securityGuardController.addSecurityGuard);
router.delete('/:id', securityGuardController.deleteSecurityGuard);

module.exports = router;
