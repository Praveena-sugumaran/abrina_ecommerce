const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
    tender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    price_offered: { type: Number, required: true },
    delivery_days: { type: Number, required: true },
    notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Bid', bidSchema);
