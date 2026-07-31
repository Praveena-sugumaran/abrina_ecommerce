const mongoose = require('mongoose');

const GiftCardTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    value: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        default: 100,
        min: 0
    },
    sold_count: {
        type: Number,
        default: 0
    },
    is_active: {
        type: Boolean,
        default: true
    },
    image: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: 'Official Marketplace Store Gift Voucher'
    },
    terms: {
        type: String,
        default: 'Valid for all product bookings and checkout orders. Non-refundable.'
    },
    code_prefix: {
        type: String,
        default: 'GIFT'
    },
    expires_in_days: {
        type: Number,
        default: 365
    }
}, { timestamps: true });

module.exports = mongoose.model('GiftCardTemplate', GiftCardTemplateSchema);
