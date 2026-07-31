const mongoose = require('mongoose');

const promotionProductSchema = new mongoose.Schema(
    {
        promotion: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Promotion',
            required: [true, 'Promotion ID is required'],
            index: true
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product ID is required'],
            index: true
        },
        priority: {
            type: Number, // Optional override per product
            default: null
        }
    },
    { timestamps: true }
);

// Prevent duplicate mappings
promotionProductSchema.index({ promotion: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('PromotionProduct', promotionProductSchema);
