const mongoose = require('mongoose');

const promotionUsageSchema = new mongoose.Schema(
    {
        promotion: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Promotion',
            required: [true, 'Promotion ID is required'],
            index: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            index: true
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: [true, 'Order ID is required'],
            index: true
        },
        used_at: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('PromotionUsage', promotionUsageSchema);
