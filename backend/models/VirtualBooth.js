const mongoose = require('mongoose');

const virtualBoothSchema = new mongoose.Schema({
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company_name: { type: String, required: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    videos: [{ type: String }], // URLs to showroom clips
    brochures: [{ type: String }] // URLs to product PDF catalogs
}, { timestamps: true });

module.exports = mongoose.model('VirtualBooth', virtualBoothSchema);
