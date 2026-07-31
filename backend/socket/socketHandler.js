const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const User = require('../models/User');

const initSocket = async (server) => {
    const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:3000";
    const allowedOrigins = rawOrigins.split(',').map(url => url.trim());

    const io = new Server(server, {
        cors: {
            origin: function (origin, callback) {
                // Allow all origins to align with express cors settings in server.js
                callback(null, true);
            },
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Redis Setup
    try {
        const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log('Redis connected and Socket.io adapter set up.');
    } catch (err) {
        console.warn('Redis connection failed, defaulting to memory adapter.', err.message);
    }

    let users = {}; // userId -> socketId
    let userRateLimits = {}; // userId -> timestamp[]

    io.on('connection', (socket) => {
        console.log('New client connected', socket.id);

        socket.on('join', (userId) => {
            if (!userId) {
                console.warn('📡 Socket: Join attempted with empty userId');
                return;
            }
            const userRoom = userId.toString();
            socket.join(userRoom);
            console.log(`📡 Socket: User ${userRoom} joined their personal room. (Socket ID: ${socket.id})`);
        });

        socket.on('sendMessage', async (data) => {
            const { conversationId, senderId, receiverId, content, messageType, attachments, productDetails, orderId } = data;

            try {
                // Save to Database
                const newMessage = new Message({
                    conversationId,
                    senderId,
                    receiverId,
                    content,
                    messageType,
                    attachments,
                    productDetails,
                    orderId
                });

                // Simple Translation Support (Mock or Logic)
                // For demonstration, we can auto-translate to 'es' if requested, or just structure it
                newMessage.translations = new Map();
                // In a real app, you'd call a translation API here
                // Example: newMessage.translations.set('es', await translate(content, 'es'));

                await newMessage.save();

                // Update Conversation last message
                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: newMessage._id,
                    updatedAt: new Date()
                });

                // Emit to Receiver
                io.to(receiverId.toString()).emit('messageReceived', newMessage);

                // Emit to Sender (for sync across multiple tabs)
                io.to(senderId.toString()).emit('messageSent', newMessage);

                // Determine receiver's role in the conversation
                const conversation = await Conversation.findById(conversationId);
                let receiverRole = 'buyer';
                if (conversation && conversation.supplier_id.toString() === receiverId.toString()) {
                    receiverRole = 'supplier';
                }

                // Create Notification
                const sender = await User.findById(senderId);
                const senderName = sender ? `${sender.first_name} ${sender.last_name}` : 'User';

                const notification = new Notification({
                    userId: receiverId,
                    title: `new message from ${senderName}`.trim(),
                    message: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                    type: 'chat',
                    role: receiverRole,
                    link: `${receiverRole === 'supplier' ? '/supplier' : ''}/dashboard/chat/${conversationId}`
                });
                await notification.save();

                // Emit Notification
                console.log(`🔔 Emitting notificationReceived to room ${receiverId.toString()}`);
                io.to(receiverId.toString()).emit('notificationReceived', notification);

            } catch (err) {
                console.error('Socket sendMessage error:', err);
            }
        });

        socket.on('markAsRead', async (data) => {
            const userId = data.userId || data.receiverId;
            const { conversationId } = data;
            
            if (!userId) {
                console.warn('📡 Socket: markAsRead error - missing userId/receiverId');
                return;
            }

            try {
                await Message.updateMany(
                    { conversationId, receiverId: userId, isRead: false },
                    { $set: { isRead: true } }
                );

                // Notify the sender that messages were read
                // We need to find who the sender was for these messages
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) return;

                const otherUserId = conversation.buyer_id && conversation.buyer_id.toString() === userId.toString() 
                    ? conversation.supplier_id 
                    : conversation.buyer_id;

                if (otherUserId) {
                    io.to(otherUserId.toString()).emit('messagesRead', { conversationId, readerId: userId });
                }
            } catch (err) {
                console.error('📡 Socket: markAsRead error:', err);
            }
        });

        socket.on('joinTender', (tenderId) => {
            if (tenderId) {
                socket.join(`tender_${tenderId}`);
                console.log(`📡 Socket: User joined tender room tender_${tenderId}`);
            }
        });

        socket.on('leaveTender', (tenderId) => {
            if (tenderId) {
                socket.leave(`tender_${tenderId}`);
                console.log(`📡 Socket: User left tender room tender_${tenderId}`);
            }
        });

        socket.on('joinStream', async (streamId) => {
            if (streamId) {
                const roomName = `stream_${streamId}`;
                // check if was already in room to prevent double counts
                const wasInRoom = socket.rooms.has(roomName);
                
                await socket.join(roomName);
                console.log(`📡 Socket: User joined stream room ${roomName}`);
                
                if (!wasInRoom) {
                    try {
                        const LiveStream = require('../models/LiveStream');
                        const stream = await LiveStream.findById(streamId);
                        if (stream) {
                            stream.viewer_count = (stream.viewer_count || 0) + 1;
                            if (stream.viewer_count > stream.peak_viewers) {
                                stream.peak_viewers = stream.viewer_count;
                            }
                            await stream.save();
                            
                            const LiveStreamAnalytics = require('../models/LiveStreamAnalytics');
                            await LiveStreamAnalytics.findOneAndUpdate(
                                { stream_id: stream._id },
                                { $max: { peak_viewers: stream.peak_viewers } }
                            );

                            io.to(roomName).emit('streamStatsUpdate', {
                                viewer_count: stream.viewer_count,
                                peak_viewers: stream.peak_viewers
                            });
                        }
                    } catch (err) {
                        console.error('Socket joinStream error:', err);
                    }
                }
            }
        });

        socket.on('leaveStream', async (streamId) => {
            if (streamId) {
                const roomName = `stream_${streamId}`;
                const wasInRoom = socket.rooms.has(roomName);
                
                await socket.leave(roomName);
                console.log(`📡 Socket: User left stream room ${roomName}`);
                
                if (wasInRoom) {
                    try {
                        const LiveStream = require('../models/LiveStream');
                        const stream = await LiveStream.findById(streamId);
                        if (stream) {
                            stream.viewer_count = Math.max(0, (stream.viewer_count || 0) - 1);
                            await stream.save();
                            
                            io.to(roomName).emit('streamStatsUpdate', {
                                viewer_count: stream.viewer_count
                            });
                        }
                    } catch (err) {
                        console.error('Socket leaveStream error:', err);
                    }
                }
            }
        });

        socket.on('sendReaction', (data) => {
            const { streamId, reactionType } = data;
            if (!streamId || !reactionType) return;
            // Broadcast the reaction to all other sockets in the stream room
            socket.to(`stream_${streamId}`).emit('reactionReceived', { reactionType });
        });

        socket.on('sendStreamMessage', async (data) => {
            const { streamId, senderId, senderName, content, targetLanguage, replyToMessageId, replyToUserName, replyToContent } = data;
            if (!senderId || !content) return;

            // 1. Rate Limiting: Max 5 messages per 10 seconds
            const now = Date.now();
            if (!userRateLimits[senderId]) {
                userRateLimits[senderId] = [];
            }
            userRateLimits[senderId] = userRateLimits[senderId].filter(ts => now - ts < 10000);
            
            if (userRateLimits[senderId].length >= 5) {
                socket.emit('streamMessageReceived', {
                    isAlert: true,
                    text: '⚠️ Warning: You are sending messages too fast. Rate limit is 5 messages per 10 seconds.'
                });
                return;
            }
            userRateLimits[senderId].push(now);

            // 2. Profanity & Spam Filter
            let filteredContent = content;
            const blacklist = ['spam', 'scam', 'fake', 'hack', 'cheat', 'abuse', 'buy cheap followers'];
            blacklist.forEach(badWord => {
                const regex = new RegExp(`\\b${badWord}\\b`, 'gi');
                filteredContent = filteredContent.replace(regex, '***');
            });

            // 3. Translation logic (AI mock)
            let translation = null;
            if (targetLanguage && targetLanguage !== 'English') {
                const translationsMock = {
                    'es': {
                        'hello': 'hola',
                        'price': 'precio',
                        'minimum order': 'pedido mínimo',
                        'can you show the product?': '¿puedes mostrar el producto?',
                        'how much is shipping?': '¿cuánto cuesta el envío?',
                        'what is the quality?': '¿cuál es la calidad?'
                    },
                    'zh': {
                        'hello': '你好',
                        'price': '价格',
                        'minimum order': '起订量',
                        'can you show the product?': '你能展示一下产品吗？',
                        'how much is shipping?': '运费是多少？',
                        'what is the quality?': '质量怎么样？'
                    }
                };
                const langCode = targetLanguage.toLowerCase().substring(0, 2);
                const lowerContent = filteredContent.toLowerCase().trim();
                const mockMap = translationsMock[langCode] || translationsMock['es'];
                translation = mockMap[lowerContent] || `[Auto-Translated to ${targetLanguage}]: ${filteredContent}`;
            }

            try {
                // 4. Chat Storage
                const LiveStreamMessage = require('../models/LiveStreamMessage');
                const LiveStream = require('../models/LiveStream');

                const savedMsg = await LiveStreamMessage.create({
                    stream_id: streamId,
                    user_id: senderId,
                    user_name: senderName || 'User',
                    message: filteredContent,
                    translated_message: translation || '',
                    language: targetLanguage || 'English',
                    reply_to_message_id: replyToMessageId || null,
                    reply_to_user_name: replyToUserName || null,
                    reply_to_content: replyToContent || null
                });

                await LiveStream.findByIdAndUpdate(streamId, { $inc: { total_messages: 1 } });

                // 5. Broadcast message
                io.to(`stream_${streamId}`).emit('streamMessageReceived', {
                    _id: savedMsg._id,
                    streamId,
                    senderId,
                    senderName: senderName || 'User',
                    content: filteredContent,
                    translation,
                    timestamp: savedMsg.createdAt,
                    replyToMessageId: savedMsg.reply_to_message_id,
                    replyToUserName: savedMsg.reply_to_user_name,
                    replyToContent: savedMsg.reply_to_content
                });
            } catch (err) {
                console.error('Socket sendStreamMessage db error:', err);
            }
        });

        socket.on('pollVoteCast', async (data) => {
            const { streamId, optionIndex } = data;
            if (!streamId || optionIndex === undefined) return;
            try {
                const LiveStream = require('../models/LiveStream');
                const stream = await LiveStream.findById(streamId);
                if (stream && stream.active_poll && stream.active_poll.options[optionIndex]) {
                    stream.active_poll.options[optionIndex].votes += 1;
                    stream.markModified('active_poll');
                    await stream.save();

                    io.to(`stream_${streamId}`).emit('pollVoteCast', stream.active_poll);
                }
            } catch (err) {
                console.error('Socket pollVoteCast db error:', err);
            }
        });

        socket.on('typingInStream', (data) => {
            const { streamId, senderName, isTyping } = data;
            socket.to(`stream_${streamId}`).emit('streamTypingUpdated', { senderName, isTyping });
        });

        socket.on('disconnecting', async () => {
            for (const room of socket.rooms) {
                if (room.startsWith('stream_')) {
                    const streamId = room.replace('stream_', '');
                    console.log(`📡 Socket: Auto-leaving stream room ${room} on disconnect`);
                    try {
                        const LiveStream = require('../models/LiveStream');
                        const stream = await LiveStream.findById(streamId);
                        if (stream) {
                            stream.viewer_count = Math.max(0, (stream.viewer_count || 0) - 1);
                            await stream.save();
                            
                            io.to(room).emit('streamStatsUpdate', {
                                viewer_count: stream.viewer_count
                            });
                        }
                    } catch (err) {
                        console.error('Socket stream disconnect viewer update error:', err);
                    }
                }
            }
        });

        socket.on('disconnect', () => {
            for (let userId in users) {
                if (users[userId] === socket.id) {
                    delete users[userId];
                    console.log(`User ${userId} disconnected`);
                    break;
                }
            }
        });
    });

    return io;
};

let _io;
const setIO = (io) => { _io = io; };
const getIO = () => _io;

module.exports = { initSocket, setIO, getIO };
