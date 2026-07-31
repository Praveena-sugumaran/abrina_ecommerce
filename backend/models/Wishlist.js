const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
    {
        buyer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true
        }
    },
    { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// Ensure a user can only wishlist a specific product once
wishlistSchema.index({ buyer_id: 1, product_id: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
