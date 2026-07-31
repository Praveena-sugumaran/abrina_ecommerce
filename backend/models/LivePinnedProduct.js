const mongoose = require('mongoose');

const livePinnedProductSchema = new mongoose.Schema({
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    pinned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pinned_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('LivePinnedProduct', livePinnedProductSchema);
