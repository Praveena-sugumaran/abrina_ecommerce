const mongoose = require('mongoose');

const payoutMethodSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // e.g., 'bank_transfer', 'paypal'
    name: { type: String, required: true }, // e.g., 'Bank Transfer'
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    fields: [{
        name: { type: String, required: true }, // e.g., 'bank_name'
        label: { type: String, required: true }, // e.g., 'Bank Name'
        type: { type: String, default: 'text' }, // text, number, etc.
        placeholder: { type: String, default: '' },
        required: { type: Boolean, default: true }
    }],
    instructions: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('PayoutMethod', payoutMethodSchema);
