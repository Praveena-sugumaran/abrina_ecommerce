const mongoose = require('mongoose');

const PriceHistorySchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    price: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

// Combined index for efficient lookup and sorting
PriceHistorySchema.index({ product: 1, date: 1 });

module.exports = mongoose.model('PriceHistory', PriceHistorySchema);
