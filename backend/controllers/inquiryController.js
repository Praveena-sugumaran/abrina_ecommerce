const Inquiry = require('../models/Inquiry');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Product = require('../models/Product');
const { sendNotification } = require('../services/notificationService');
const { addJob } = require('../services/queueService');
const User = require('../models/User');

exports.createInquiry = async (req, res) => {
    try {
        const { productId, message, quantity, unit, isCustomizationRequest, subject } = req.body;

        // ── Subscription Check for Buyer Inquiries ──
        const user = await User.findById(req.user._id).populate('subscription_plan');
        const limit = user?.subscription_plan ? user.subscription_plan.max_inquiries : 10; // Default 10 for free users

        if (limit !== -1) {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const inquiryCount = await Inquiry.countDocuments({
                buyer: req.user._id,
                createdAt: { $gte: startOfMonth }
            });

            if (inquiryCount >= limit) {
                return res.status(403).json({ 
                    message: `Monthly inquiry limit reached (${inquiryCount}/${limit}). Please upgrade your plan to send more inquiries.` 
                });
            }
        }

        const product = await Product.findById(productId).populate('supplier');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const supplierId = product.supplier._id || product.supplier;
        const buyerId = req.user._id;

        // 1. Create or Find Conversation
        let conversation = await Conversation.findOne({
            buyer_id: buyerId,
            supplier_id: supplierId
        });

        if (!conversation) {
            conversation = await Conversation.create({
                buyer_id: buyerId,
                supplier_id: supplierId
            });
        }

        // 2. Create Message with Product Context
        const messageContent = `Inquiry about ${product.name}: ${message}`;
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

        // Update conversation with last message
        conversation.lastMessage = newMessage._id;
        await conversation.save();

        // 3. Create Inquiry Record
        const inquiry = await Inquiry.create({
            buyer: buyerId,
            supplier: supplierId,
            product: productId,
            subject: subject || `Inquiry for ${product.name}`,
            message,
            quantity,
            unit,
            isCustomizationRequest,
            conversation: conversation._id
        });

        // 4. Notify Supplier
        const io = req.app.get('io');
        if (io) {
            await sendNotification(
                io,
                supplierId,
                'New Inquiry Received',
                `Buyer sent an inquiry for ${product.name}`,
                'inquiry',
                `/dashboard/inquiries`
            );

            // Also emit message via socket if possible
            io.to(supplierId.toString()).emit('messageReceived', newMessage);
        }

        // 📧 Send Email to Supplier (Queued Template)
        try {
            const { enqueueTemplatedMail } = require('../services/mailService');
            const supplierUser = await User.findById(supplierId);
            if (supplierUser && supplierUser.email) {
                enqueueTemplatedMail('new-inquiry-received', supplierUser.email, {
                    first_name: supplierUser.first_name || 'Supplier',
                    buyer_name: `${req.user.first_name} ${req.user.last_name}`,
                    product_name: product.name,
                    subject: subject || `Inquiry for ${product.name}`,
                    quantity: quantity,
                    unit: unit,
                    message: message,
                    inquiry_url: `${process.env.FRONTEND_URL}/dashboard/inquiries`
                }).catch(e => console.error('Inquiry email notify error:', e));
            }
        } catch (mailErr) {
            console.error('Inquiry email notification error:', mailErr);
        }

        res.status(201).json(inquiry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMyInquiries = async (req, res) => {
    try {
        const hasSupplier = req.user.roles?.includes('supplier') || req.user.role === 'supplier';
        const hasBuyer = req.user.roles?.includes('buyer') || req.user.role === 'buyer';

        const query =
            hasSupplier && hasBuyer
                ? { $or: [{ supplier: req.user._id }, { buyer: req.user._id }] }
                : hasSupplier
                    ? { supplier: req.user._id }
                    : { buyer: req.user._id };

        const inquiries = await Inquiry.find(query)
            .populate('product', 'name main_image main_price')
            .populate('buyer', 'first_name last_name company_name country_code')
            .populate('supplier', 'first_name last_name company_name country_code')
            .sort({ createdAt: -1 });

        res.json(inquiries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getInquiryById = async (req, res) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id)
            .populate('product')
            .populate('buyer', 'first_name last_name company_name')
            .populate('supplier', 'first_name last_name company_name');

        if (!inquiry) return res.status(404).json({ message: 'Inquiry not found' });

        res.json(inquiry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(inquiry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
