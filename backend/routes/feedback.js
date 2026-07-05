const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/feedback/summary
router.get('/summary', authMiddleware, feedbackController.getFeedbackSummary);

// GET /api/feedback/form
router.get('/form', feedbackController.getFeedbackForm);

// GET /api/feedback/distribution
router.get('/distribution', authMiddleware, feedbackController.getDailyDistribution);

// POST /api/feedback/submit
router.post('/submit', feedbackController.submitFeedback);

// ── Helpdesk Issue Tickets ──────────────────────────────────────────────────
router.get('/issues', authMiddleware, feedbackController.getIssues);
router.put('/issues/:id/status', authMiddleware, feedbackController.updateIssueStatus);

module.exports = router;
