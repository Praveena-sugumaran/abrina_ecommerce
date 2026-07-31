const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    supplier_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        trim: true
    },
    images: [{
        type: String
    }],
    videos: [{
        type: String
    }],
    reply_comment: {
        type: String,
        trim: true
    },
    reply_date: {
        type: Date
    },
    is_hidden: {
        type: Boolean,
        default: false
    },
    report_count: {
        type: Number,
        default: 0
    },
    report_reasons: [{
        type: String
    }],
    reported_by: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

// Ensure a buyer can only review a product for a specific order once
reviewSchema.index({ buyer_id: 1, product_id: 1, order_id: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
