const mongoose = require('mongoose');

const liveStreamQuoteSchema = new mongoose.Schema({
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true },
    buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: 'pieces' },
    price_offered: { type: Number },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('LiveStreamQuote', liveStreamQuoteSchema);
