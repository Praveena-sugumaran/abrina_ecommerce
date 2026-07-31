const express = require('express');
const router = express.Router();
const {
    getConversations,
    getMessages,
    sendMessage,
    markAsRead
} = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/conversations', getConversations);
router.get('/messages/:otherUserId', getMessages);
router.post('/messages', sendMessage);
router.put('/messages/:conversationId/read', markAsRead);
router.post('/upload', require('../controllers/chatController').uploadChatFile);
router.post('/translate', require('../controllers/chatController').translateMessage);

module.exports = router;
