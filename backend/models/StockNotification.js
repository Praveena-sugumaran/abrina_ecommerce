const mongoose = require('mongoose');

const stockNotificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'sent'],
        default: 'pending'
    }
}, { timestamps: true });

// Avoid duplicate subscription for same product and email if it's still pending
stockNotificationSchema.index({ email: 1, product_id: 1, status: 1 }, { unique: true });

module.exports = mongoose.model('StockNotification', stockNotificationSchema);
