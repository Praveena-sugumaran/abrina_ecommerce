const mongoose = require('mongoose');

const industryHubSchema = new mongoose.Schema({
    title: { type: String, required: true },
    desc: { type: String, required: true },
    country: { type: String, required: true },
    flag: { type: String, required: true },
    image: { type: String, required: true },
    sideImages: [{ type: String }],
    sideProduct1: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sideProduct2: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('IndustryHub', industryHubSchema);
