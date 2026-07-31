const mongoose = require('mongoose');

const footerSectionSchema = new mongoose.Schema({
    label: { type: String, required: true },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    links: [{
        title: { type: String, required: true },
        url: { type: String, required: true },
        order: { type: Number, default: 0 }
    }]
}, { timestamps: true });

module.exports = mongoose.model('FooterSection', footerSectionSchema);
