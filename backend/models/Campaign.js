const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    supplier_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['email', 'affiliate', 'sms'],
        required: true,
        index: true
    },
    target_type: {
        type: String,
        enum: ['product', 'shop'],
        default: 'shop'
    },
    target_product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        default: null
    },
    coupon_code: {
        type: String,
        default: ''
    },
    // Email Campaign Fields
    email_subject: {
        type: String,
        default: ''
    },
    email_body: {
        type: String,
        default: ''
    },
    target_emails: {
        type: [String],
        default: []
    },
    // SMS Campaign Fields
    sms_body: {
        type: String,
        default: ''
    },
    target_phones: {
        type: [String],
        default: []
    },
    // Affiliate Campaign Fields
    referral_code: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    clicks: {
        type: Number,
        default: 0
    },
    referred_orders_count: {
        type: Number,
        default: 0
    },
    referred_sales_amount: {
        type: Number,
        default: 0.0
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    sent_at: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
