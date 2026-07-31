const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Promotion title is required'],
            trim: true,
            index: true
        },
        promotion_category: {
            type: String,
            enum: ['SALE', 'COUPON', 'LOYALTY', 'BUNDLE'],
            required: true,
            index: true
        },
        promotion_subtype: {
            type: String,
            required: true, // e.g., 'Flash', 'Super Deal', 'Platform Coupon', 'Welcome'
            trim: true,
            index: true
        },
        priority: {
            type: Number,
            default: 50,
            index: true
        },
        discount_type: {
            type: String,
            enum: ['percentage', 'fixed'],
            required: true
        },
        discount_value: {
            type: Number,
            required: true
        },
        lifecycle_state: {
            type: String,
            enum: ['Draft', 'Scheduled', 'Active', 'Paused', 'Expired', 'Archived'],
            default: 'Draft',
            index: true
        },
        start_date: {
            type: Date,
            index: true
        },
        end_date: {
            type: Date,
            index: true
        },
        rules: {
            type: mongoose.Schema.Types.Mixed,
            default: {} // e.g., { userType: 'NEW', minimumSpend: 50, maxPerCustomer: 2 }
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Promotion', promotionSchema);
