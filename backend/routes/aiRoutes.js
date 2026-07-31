const express = require('express');
const router = express.Router();
const {
    aiSourcingSearch,
    refineAiText,
    getAiHistory,
    deleteHistory,
    getAiUsage,
    aiChatbot,
    aiRecommendations,
    aiNegotiationHelper
} = require('../controllers/aiController');
const { protect, softProtect } = require('../middlewares/authMiddleware');

router.post('/search', softProtect, aiSourcingSearch);
router.post('/refine', protect, refineAiText);
router.get('/history', protect, getAiHistory);
router.get('/usage', protect, getAiUsage);
router.delete('/history/:id', protect, deleteHistory);

// Chatbot, recommendations, and negotiation advisor
router.post('/chatbot', protect, aiChatbot);
router.get('/recommendations', protect, aiRecommendations);
router.post('/negotiation-helper', protect, aiNegotiationHelper);

module.exports = router;

