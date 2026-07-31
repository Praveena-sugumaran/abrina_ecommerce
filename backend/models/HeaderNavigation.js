const mongoose = require('mongoose');

const headerNavigationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isFlash: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'HeaderNavigation', default: null }
}, { timestamps: true });

module.exports = mongoose.model('HeaderNavigation', headerNavigationSchema);
