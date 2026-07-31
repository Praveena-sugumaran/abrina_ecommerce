const mongoose = require('mongoose');

const trustItemSchema = new mongoose.Schema({
    label: { type: String, required: true },
    icon: { type: String }, // Stores SVG path data or the entire SVG string
    translation_key: { type: String }, // Optional translation key
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('TrustItem', trustItemSchema);
