const StockNotification = require('../models/StockNotification');
const Notification = require('../models/Notification');
const Product = require('../models/Product');

// @desc    Subscribe to back in stock alert
// @route   POST /api/stock-notifications/subscribe
// @access  Public
exports.subscribeToStock = async (req, res) => {
    try {
        const { email, product_id } = req.body;

        if (!email || !product_id) {
            return res.status(400).json({ message: 'Email and Product ID are required.' });
        }

        const product = await Product.findById(product_id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        // Check if there is already a pending subscription for this email/product
        const existing = await StockNotification.findOne({
            email: email.toLowerCase().trim(),
            product_id,
            status: 'pending'
        });

        if (existing) {
            return res.json({ success: true, message: 'You are already subscribed to stock alerts for this product.' });
        }

        const subscription = await StockNotification.create({
            email: email.toLowerCase().trim(),
            product_id,
            user_id: req.user ? req.user._id : undefined,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: 'Successfully subscribed to stock alerts. We will notify you when it returns to stock!',
            subscription
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Trigger notifications when stock changes
// Internal Helper
exports.triggerStockNotifications = async (productId, productName) => {
    try {
        const pendingAlerts = await StockNotification.find({
            product_id: productId,
            status: 'pending'
        });

        if (pendingAlerts.length === 0) return;

        for (const alert of pendingAlerts) {
            // If the user has a registered ID on the platform, send them a system notification
            if (alert.user_id) {
                await Notification.create({
                    userId: alert.user_id,
                    title: 'Back in Stock Alert! 🎉',
                    message: `Good news! "${productName}" is back in stock. Place your order now before it sells out again.`,
                    role: 'buyer',
                    type: 'system',
                    link: `/product/${productId}`
                });
            }

            // In a real-world scenario, we would send a transactional email here.
            console.log(`[MOCK EMAIL SENT] To: ${alert.email} - Product "${productName}" is back in stock! Link: /product/${productId}`);

            // Mark as sent
            alert.status = 'sent';
            await alert.save();
        }
    } catch (error) {
        console.error('Error triggering stock notifications:', error);
    }
};
