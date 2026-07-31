const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    discount_type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: [true, 'Discount type is required']
    },
    discount_value: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount value cannot be negative']
    },
    min_order_amount: {
        type: Number,
        default: 0,
        min: [0, 'Minimum order amount cannot be negative']
    },
    max_discount_amount: {
        type: Number,
        default: null,
        min: [0, 'Maximum discount amount cannot be negative']
    },
    start_date: {
        type: Date,
        required: [true, 'Start date is required']
    },
    end_date: {
        type: Date,
        required: [true, 'End date is required']
    },
    usage_limit: {
        type: Number,
        default: null,
        min: [1, 'Usage limit must be at least 1']
    },
    used_count: {
        type: Number,
        default: 0,
        min: [0, 'Used count cannot be negative']
    },
    user_usage_limit: {
        type: Number,
        default: 1,
        min: [1, 'User usage limit must be at least 1']
    },
    is_active: {
        type: Boolean,
        default: true
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null, // null means global platform coupon
        index: true
    }
}, {
    timestamps: true
});

// Pre-save hook to ensure the code is uppercase
couponSchema.pre('save', function() {
    if (this.isModified('code')) {
        this.code = this.code.toUpperCase().trim();
    }
});

module.exports = mongoose.model('Coupon', couponSchema);
