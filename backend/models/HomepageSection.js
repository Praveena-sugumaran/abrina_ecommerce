const mongoose = require('mongoose');

const homepageSectionSchema = new mongoose.Schema({
    id_name: { type: String, required: true, unique: true },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('HomepageSection', homepageSectionSchema);
