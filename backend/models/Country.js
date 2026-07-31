const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true   // ISO 3166-1 alpha-2 e.g. "IN", "US"
    },
    dial_code: {
        type: String,
        required: true,
        trim: true   // e.g. "+91", "+1"
    },
    flag: {
        type: String,
        default: ''   // emoji flag e.g. "🇮🇳"
    },
    phone_length: {
        type: Number,
        default: 10   // Expected number of digits for validation
    },
    currency: {
        type: String,
        default: ''   // e.g. "INR", "USD"
    },
    language_code: {
        type: String,
        default: 'en' // Default language
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Country', countrySchema);
