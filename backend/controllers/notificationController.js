const PushSubscription = require('../models/PushSubscription');
const Notification = require('../models/Notification');

// @desc    Get user notifications by role
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
        const { role = 'buyer' } = req.query;
        const notifications = await Notification.find({
            userId: req.user._id,
            role
        }).sort({ createdAt: -1 }).limit(50);

        res.json(notifications);
    } catch (error) {
        console.error('Fetch notifications error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark all role notifications as read for a user
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllRead = async (req, res) => {
    try {
        const { role = 'buyer' } = req.query;
        await Notification.updateMany(
            { userId: req.user._id, role, isRead: false },
            { isRead: true }
        );

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a push notification subscription endpoint
// @route   POST /api/notifications/subscribe
// @access  Private
exports.subscribePush = async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ message: 'Subscription details are required' });
        }

        // Upsert subscription to prevent duplicates
        await PushSubscription.findOneAndUpdate(
            { user_id: req.user._id, 'subscription.endpoint': subscription.endpoint },
            { user_id: req.user._id, subscription },
            { upsert: true, new: true }
        );

        res.status(201).json({ success: true, message: 'Push subscription registered successfully' });
    } catch (error) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Broadcast a notifications alert to all users (Admin only)
// @route   POST /api/notifications/broadcast
// @access  Private/Admin
exports.broadcastPushNotification = async (req, res) => {
    try {
        const { title, body, url = '/' } = req.body;
        if (!title || !body) {
            return res.status(400).json({ message: 'Title and body are required' });
        }

        // 1. Save standard notification entries in db for all users or logged-in users
        const User = require('../models/User');
        const users = await User.find({}).select('_id');

        const notificationRecords = users.map(u => ({
            userId: u._id,
            title,
            message: body,
            type: 'system',
            link: url,
            isRead: false,
            role: 'buyer'
        }));

        await Notification.insertMany(notificationRecords);

        // 2. Dispatch Socket.io live event
        const { sendNotification } = require('../services/notificationService');
        for (const u of users) {
            sendNotification(req.io, u._id, title, body, 'system', url).catch(() => {});
        }

        // 3. Log push simulation
        const activePushCount = await PushSubscription.countDocuments();
        console.log(`[PUSH NOTIFICATION BROADCAST] Title: "${title}" | Body: "${body}" | Sent to ${activePushCount} service worker subscriptions`);

        res.json({
            success: true,
            message: `Notification broadcasted to ${users.length} active platform users and logged for ${activePushCount} PWA clients.`,
            recipients: users.length,
            pwaSubscribersCount: activePushCount
        });
    } catch (error) {
        console.error('Broadcast notification error:', error);
        res.status(500).json({ message: error.message });
    }
};
