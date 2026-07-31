const mongoose = require('mongoose');
const LiveStream = require('../models/LiveStream');
const Product = require('../models/Product');
const Inquiry = require('../models/Inquiry');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const LiveStreamMessage = require('../models/LiveStreamMessage');
const LiveStreamQuote = require('../models/LiveStreamQuote');
const LiveStreamAnalytics = require('../models/LiveStreamAnalytics');
const { sendNotification } = require('../services/notificationService');
const crypto = require('crypto');
const SiteSetting = require('../models/SiteSetting');

const getStreamQuery = (idOrSlug) => {
    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
        ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] }
        : { slug: idOrSlug };
    return LiveStream.findOne(query);
};

const getStreamId = async (idOrSlug) => {
    if (!idOrSlug) return null;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
        return idOrSlug;
    }
    const stream = await LiveStream.findOne({ slug: idOrSlug }).select('_id');
    return stream ? stream._id : null;
};

// Create stream
const createStream = async (req, res) => {
    try {
        const siteSetting = await SiteSetting.findOne();
        if (siteSetting && siteSetting.live_stream_enabled === false) {
            return res.status(403).json({ message: 'Live streaming is currently disabled by the administrator' });
        }

        const { title, description, products, start_time, stream_provider, category_id } = req.body;
        
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        const raw_key = `key_${crypto.randomBytes(12).toString('hex')}`;
        const provider = stream_provider || 'mock';

        let rtmp_url = '';
        let playback_url = '';

        if (provider === 'zegocloud') {
            rtmp_url = `rtmp://push.zegocloud.com/live/${raw_key}`;
            playback_url = `https://pull.zegocloud.com/live/${raw_key}.m3u8`;
        } else {
            rtmp_url = `rtmp://localhost/live/`;
            playback_url = `https://assets.mixkit.co/videos/preview/mixkit-working-in-a-warehouse-40019-large.mp4`;
        }

        const stream = new LiveStream({
            supplier_id: req.user._id,
            title,
            description: description || '',
            status: 'upcoming',
            start_time: start_time || new Date(),
            stream_provider: provider,
            stream_key: raw_key,
            playback_url,
            rtmp_url,
            products: products || [],
            category_id: category_id || null
        });

        await stream.save();

        // Instantiate analytics tracker
        await LiveStreamAnalytics.create({
            stream_id: stream._id
        });

        // Return the stream, including the raw stream key once so they can configure OBS
        const streamData = stream.toObject();
        streamData.raw_stream_key = raw_key; 

        res.status(201).json(streamData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// List streams
const listStreams = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) {
            filter.status = status;
        }

        const streams = await LiveStream.find(filter)
            .populate('supplier_id', 'first_name last_name company_name profile_image country_code')
            .populate('products', 'name main_image main_price')
            .sort({ start_time: -1 });

        res.json(streams);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get stream details
const getStreamDetails = async (req, res) => {
    try {
        const stream = await getStreamQuery(req.params.id)
            .populate('supplier_id', 'first_name last_name company_name profile_image country_code')
            .populate('products')
            .populate('pinned_product');

        if (!stream) {
            return res.status(404).json({ message: 'Live stream not found' });
        }

        res.json(stream);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update stream status (supplier only)
const updateStreamStatus = async (req, res) => {
    try {
        const siteSetting = await SiteSetting.findOne();
        if (siteSetting && siteSetting.live_stream_enabled === false) {
            return res.status(403).json({ message: 'Live streaming is currently disabled by the administrator' });
        }

        const { status } = req.body;
        const stream = await getStreamQuery(req.params.id);

        if (!stream) {
            return res.status(404).json({ message: 'Live stream not found' });
        }

        // Verify supplier ownership
        if (stream.supplier_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to manage this live stream' });
        }

        if (status) {
            stream.status = status;
            if (status === 'live') {
                stream.start_time = new Date();
            } else if (status === 'ended') {
                stream.end_time = new Date();
                stream.recording_url = `/uploads/mock_recording.mp4`;
                stream.recording_duration = 1800; // default 30 mins
                stream.recording_size = 350 * 1024 * 1024; // mock size

                // Aggregate statistics on ending
                const totalMsg = await LiveStreamMessage.countDocuments({ stream_id: stream._id });
                const totalQ = await LiveStreamQuote.countDocuments({ stream_id: stream._id });
                
                stream.total_messages = totalMsg;
                stream.total_quotes = totalQ;

                // Sync with Analytics
                await LiveStreamAnalytics.findOneAndUpdate(
                    { stream_id: stream._id },
                    { 
                        chat_messages: totalMsg, 
                        quote_requests: totalQ,
                        peak_viewers: stream.peak_viewers 
                    }
                );
            }
        }

        await stream.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('streamStatusChanged', { streamId: stream._id, status: stream.status });
        }

        res.json(stream);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Join stream
const joinStream = async (req, res) => {
    try {
        const stream = await getStreamQuery(req.params.id);
        if (!stream) return res.status(404).json({ message: 'Stream not found' });

        res.json({ success: true, viewer_count: stream.viewer_count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Leave stream
const leaveStream = async (req, res) => {
    try {
        const stream = await getStreamQuery(req.params.id);
        if (!stream) return res.status(404).json({ message: 'Stream not found' });

        res.json({ success: true, viewer_count: stream.viewer_count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Request quote during live stream
const requestQuoteDuringStream = async (req, res) => {
    try {
        const { productId, message, quantity, unit } = req.body;
        const streamId = req.params.id;

        const stream = await getStreamQuery(streamId);
        if (!stream) {
            return res.status(404).json({ message: 'Live stream not found' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const supplierId = stream.supplier_id;
        const buyerId = req.user._id;

        // 1. Create Inquiry
        let conversation = await Conversation.findOne({ buyer_id: buyerId, supplier_id: supplierId });
        if (!conversation) {
            conversation = await Conversation.create({ buyer_id: buyerId, supplier_id: supplierId });
        }

        const messageContent = `[Live Stream: "${stream.title}"] Requested quote for: ${product.name}. Msg: ${message}`;
        const newMessage = await Message.create({
            conversationId: conversation._id,
            senderId: buyerId,
            receiverId: supplierId,
            content: messageContent,
            messageType: 'text',
            productDetails: {
                productId: product._id,
                name: product.name,
                price: product.main_price,
                image: product.main_image
            }
        });

        conversation.lastMessage = newMessage._id;
        await conversation.save();

        await Inquiry.create({
            buyer: buyerId,
            supplier: supplierId,
            product: productId,
            subject: `Live Stream Quote: ${product.name}`,
            message: `Requested quote during Live Stream "${stream.title}". Message: ${message}`,
            quantity: quantity || 1,
            unit: unit || 'pieces',
            conversation: conversation._id
        });

        // 2. Log LiveStreamQuote
        const streamQuote = await LiveStreamQuote.create({
            stream_id: streamId,
            buyer_id: buyerId,
            supplier_id: supplierId,
            product_id: productId,
            quantity: quantity || 1,
            unit: unit || 'pieces',
            price_offered: product.main_price,
            status: 'pending'
        });

        // 3. Update Stream & Analytics Counters
        stream.total_quotes = (stream.total_quotes || 0) + 1;
        await stream.save();

        await LiveStreamAnalytics.findOneAndUpdate(
            { stream_id: streamId },
            { $inc: { quote_requests: 1 } }
        );

        // 4. Send Notifications
        const io = req.app.get('io');
        if (io) {
            await sendNotification(
                io,
                supplierId,
                'New Live Stream Quote Request',
                `Buyer requested a quote during your stream for: ${product.name}`,
                'inquiry',
                `/dashboard/inquiries`
            );

            io.to(supplierId.toString()).emit('messageReceived', newMessage);

            // Broadcast quote alert inside stream room
            io.to(`stream_${streamId}`).emit('streamQuoteRequested', {
                buyer_name: `${req.user.first_name} ${req.user.last_name}`,
                product_name: product.name,
                quantity,
                unit
            });
        }

        res.status(201).json(streamQuote);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Live Product Pinning (supplier only)
const pinProduct = async (req, res) => {
    try {
        const { productId } = req.body;
        const stream = await getStreamQuery(req.params.id);

        if (!stream) return res.status(404).json({ message: 'Stream not found' });
        if (stream.supplier_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        stream.pinned_product = productId || null;
        await stream.save();

        // Notify room of pin update
        const io = req.app.get('io');
        if (io) {
            let populatedProd = null;
            if (productId) {
                populatedProd = await Product.findById(productId).select('name main_image main_price');
            }
            io.to(`stream_${stream._id}`).emit('productPinned', populatedProd);
        }

        res.json({ success: true, pinned_product: stream.pinned_product });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Live Poll Launch (supplier only)
const startPoll = async (req, res) => {
    try {
        const { question, options } = req.body;
        const stream = await getStreamQuery(req.params.id);

        if (!stream) return res.status(404).json({ message: 'Stream not found' });
        if (stream.supplier_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const pollData = {
            question,
            options: options.map(opt => ({ text: opt, votes: 0 }))
        };

        stream.active_poll = pollData;
        await stream.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`stream_${stream._id}`).emit('pollStarted', pollData);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Raise Hand Notification (buyer to supplier stream room)
const raiseHand = async (req, res) => {
    try {
        const streamId = await getStreamId(req.params.id) || req.params.id;
        const io = req.app.get('io');
        if (io) {
            io.to(`stream_${streamId}`).emit('handRaised', {
                buyer_name: `${req.user.first_name} ${req.user.last_name}`,
                buyer_id: req.user._id
            });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get stream message log for replay / chat loading
const getStreamMessages = async (req, res) => {
    try {
        const streamId = await getStreamId(req.params.id) || req.params.id;
        const messages = await LiveStreamMessage.find({ stream_id: streamId })
            .sort({ createdAt: 1 })
            .limit(100);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Fetch Analytics
const getStreamAnalytics = async (req, res) => {
    try {
        const streamId = await getStreamId(req.params.id) || req.params.id;
        const analytics = await LiveStreamAnalytics.findOne({ stream_id: streamId });
        if (!analytics) return res.status(404).json({ message: 'Analytics not found' });
        res.json(analytics);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete Live Stream (supplier or admin only)
const deleteStream = async (req, res) => {
    try {
        const stream = await getStreamQuery(req.params.id);
        if (!stream) {
            return res.status(404).json({ message: 'Live stream not found' });
        }

        // Verify supplier ownership or admin role
        const isSupplier = stream.supplier_id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || (req.user.roles && req.user.roles.includes('admin'));
        if (!isSupplier && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this live stream' });
        }

        await LiveStream.findByIdAndDelete(stream._id);

        // Clean up associated analytics and messages
        await LiveStreamAnalytics.deleteMany({ stream_id: stream._id });
        await LiveStreamMessage.deleteMany({ stream_id: stream._id });

        res.json({ success: true, message: 'Live stream deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createStream,
    listStreams,
    getStreamDetails,
    updateStreamStatus,
    joinStream,
    leaveStream,
    requestQuoteDuringStream,
    pinProduct,
    startPoll,
    raiseHand,
    getStreamMessages,
    getStreamAnalytics,
    deleteStream
};
