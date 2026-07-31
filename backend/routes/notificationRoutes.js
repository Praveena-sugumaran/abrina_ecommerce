const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { 
    subscribePush, 
    broadcastPushNotification,
    getNotifications,
    markAsRead,
    markAllRead
} = require('../controllers/notificationController');

// Retrieve user notifications by role
router.get('/', protect, getNotifications);

// Mark all as read
router.put('/read-all', protect, markAllRead);

// Mark single notification as read
router.put('/:id/read', protect, markAsRead);

// PWA push subscription and broadcast dispatchers
router.post('/subscribe', protect, subscribePush);
router.post('/broadcast', protect, broadcastPushNotification);

module.exports = router;
