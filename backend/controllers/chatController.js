const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const supplierService = require('../services/supplierService');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const multer = require('multer');
const path = require('path');

// @desc    Get all conversations for user
// @route   GET /api/chat/conversations
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const { role } = req.query; // 'buyer' or 'supplier'
        
        const query = role === 'supplier' ? { supplier_id: userId } : { buyer_id: userId };

        const conversations = await Conversation.find(query)
            .populate('buyer_id', 'first_name last_name company_name')
            .populate('supplier_id', 'first_name last_name company_name')
            .populate('lastMessage')
            .sort('-updatedAt');

        // Calculate unread counts
        const convsWithUnread = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                receiverId: userId,
                isRead: false
            });
            return {
                ...conv.toObject(),
                unreadCount
            };
        }));

        res.json(convsWithUnread);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/messages/:otherUserId
exports.getMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const otherUserId = req.params.otherUserId;
        const { role } = req.query; // current user's role

        // Robust lookup: Find conversation between these two users regardless of who is buyer/supplier
        let conversation = await Conversation.findOne({
            $or: [
                { buyer_id: userId, supplier_id: otherUserId },
                { buyer_id: otherUserId, supplier_id: userId }
            ]
        });

        if (!conversation) {
            // New conversation - we still need to assign roles for the model, but lookup will be bidirectional now
            // We use the 'role' hint from frontend to decide who is who if it's a new one
            const convData = role === 'supplier' 
                ? { supplier_id: userId, buyer_id: otherUserId }
                : { buyer_id: userId, supplier_id: otherUserId };
            conversation = await Conversation.create(convData);
        } else {
            // Mark all messages as read for the current user
            await Message.updateMany(
                { conversationId: conversation._id, receiverId: userId, isRead: false },
                { isRead: true }
            );
        }

        const messages = await Message.find({ conversationId: conversation._id }).sort('createdAt');

        // Fetch other user info to ensure frontend has it for new/empty conversations
        const otherUser = await User.findById(otherUserId).select('first_name last_name company_name profile_image');

        res.json({ 
            conversationId: conversation._id, 
            messages,
            otherUser: {
                _id: otherUser?._id,
                first_name: otherUser?.first_name,
                last_name: otherUser?.last_name,
                company_name: otherUser?.company_name,
                profile_image: otherUser?.profile_image
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Send a message
// @route   POST /api/chat/messages
exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, content, productDetails, messageType, attachments, orderId, role } = req.body;
        const senderId = req.user._id;

        // 🛡️ Anti-Spam: Limit messages per minute
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const recentMessagesCount = await Message.countDocuments({ senderId, createdAt: { $gt: oneMinuteAgo } });
        if (recentMessagesCount > 10) {
            return res.status(429).json({ message: 'Spam alert: too many messages. Please wait a minute.' });
        }

        // Bidirectional lookup
        let conversation = await Conversation.findOne({
            $or: [
                { buyer_id: senderId, supplier_id: receiverId },
                { buyer_id: receiverId, supplier_id: senderId }
            ]
        });

        if (!conversation) {
            // 🛡️ Subscription Check for Buyers starting new inquiries
            if (role === 'buyer') {
                const User = require('../models/User');
                const user = await User.findById(senderId).populate('subscription_plan');
                const plan = user?.subscription_plan;
                const isExpired = user.subscription_end && new Date() > user.subscription_end;
                
                if (!plan || isExpired) {
                    return res.status(403).json({ message: isExpired ? 'Your subscription has expired. Please renew to start new inquiries.' : 'Please subscribe to a plan to start new inquiries.' });
                }

                if (plan.max_inquiries !== -1) {
                    const startOfMonth = new Date();
                    startOfMonth.setDate(1);
                    startOfMonth.setHours(0, 0, 0, 0);

                    const conversationCount = await Conversation.countDocuments({
                        buyer_id: senderId,
                        createdAt: { $gte: startOfMonth }
                    });

                    if (conversationCount >= plan.max_inquiries) {
                        return res.status(403).json({ message: `Monthly inquiry limit reached for ${plan.name} plan (${plan.max_inquiries}). Please upgrade to contact more suppliers.` });
                    }
                }
            }

            conversation = await Conversation.create({ 
                buyer_id: role === 'supplier' ? receiverId : senderId,
                supplier_id: role === 'supplier' ? senderId : receiverId,
                orderId 
            });
        }

        const newMessage = await Message.create({
            conversationId: conversation._id,
            senderId,
            receiverId,
            content,
            messageType: messageType || 'text',
            attachments: attachments || [],
            productDetails,
            orderId
        });

        conversation.lastMessage = newMessage._id;
        conversation.updatedAt = Date.now();
        await conversation.save();

        res.status(201).json(newMessage);

        // Touch CRM Lead & Auto-reply Logic (if receiver is a supplier)
        const Company = require('../models/Company');
        const supplierCompany = await Company.findOne({ user_id: receiverId });
        if (supplierCompany) {
            const crmService = require('../services/crmService');
            await crmService.touchLead(receiverId, senderId);

            if (supplierCompany.auto_reply_enabled) {
                // Avoid spam: check if supplier sent a message in the last 30 minutes
                const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
                const recentSupplierMsg = await Message.findOne({
                    conversationId: conversation._id,
                    senderId: receiverId,
                    createdAt: { $gt: thirtyMinsAgo }
                });

                if (!recentSupplierMsg) {
                    const replyText = supplierCompany.auto_reply_text || 'Thank you for your message. We will get back to you shortly!';
                    const autoReplyMessage = await Message.create({
                        conversationId: conversation._id,
                        senderId: receiverId,
                        receiverId: senderId,
                        content: `[Auto-Reply] ${replyText}`,
                        messageType: 'text'
                    });

                    conversation.lastMessage = autoReplyMessage._id;
                    await conversation.save();

                    const ioInstance = req.io || req.app.get('io') || require('../socket/socketHandler').getIO();
                    if (ioInstance) {
                        ioInstance.to(senderId.toString()).emit('messageReceived', autoReplyMessage);
                        ioInstance.to(receiverId.toString()).emit('messageReceived', autoReplyMessage);
                    }
                }
            }
        }

        // Create Notification (Determine receiver's role based on their position in the conversation)
        let receiverRole = 'buyer';
        if (conversation.supplier_id.toString() === receiverId.toString()) {
            receiverRole = 'supplier';
        } else if (conversation.buyer_id.toString() === receiverId.toString()) {
            receiverRole = 'buyer';
        }
        
        const notification = new Notification({
            userId: receiverId,
            title: `new message from ${req.user.first_name || ''} ${req.user.last_name || ''}`.trim(),
            message: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            type: 'chat',
            role: receiverRole,
            link: `/${receiverRole}/dashboard/messages`
        });
        await notification.save();

        // Emit via socket if available
        const { getIO } = require('../socket/socketHandler');
        const io = req.io || req.app.get('io') || getIO();
        
        if (io) {
            io.to(receiverId.toString()).emit('messageReceived', newMessage);
            io.to(senderId.toString()).emit('messageReceived', newMessage);
            io.to(receiverId.toString()).emit('notificationReceived', notification);
        }

        // 📈 Update supplier response rate if sender is a supplier
        if (req.user.roles?.includes('supplier') || req.user.role === 'supplier') {
            await supplierService.updateResponseMetrics(req.user._id);
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Mark chat as read
// @route   PUT /api/chat/messages/:conversationId/read
exports.markAsRead = async (req, res) => {
    try {
        await Message.updateMany(
            { conversationId: req.params.conversationId, receiverId: req.user._id, isRead: false },
            { isRead: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// File Upload Logic
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/chat/');
    },
    filename: (req, file, cb) => {
        cb(null, `chat-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage }).single('file');

exports.uploadChatFile = (req, res) => {
    upload(req, res, (err) => {
        if (err) return res.status(500).json({ message: 'File upload failed' });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const fileUrl = `/uploads/chat/${req.file.filename}`;
        res.json({ url: fileUrl, type: req.file.mimetype.startsWith('image/') ? 'image' : 'file' });
    });
};

// @desc    Translate a message
// @route   POST /api/chat/translate
exports.translateMessage = async (req, res) => {
    try {
        const { text, target } = req.body;
        // Mock translation logic for demo
        const prefixes = {
            es: '[ES] ',
            fr: '[FR] ',
            zh: '[ZH] ',
            ar: '[AR] '
        };
        const translatedText = (prefixes[target] || '') + text;
        res.json({ translatedText });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
