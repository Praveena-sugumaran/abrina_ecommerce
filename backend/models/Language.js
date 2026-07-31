const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true   // e.g. "English", "Hindi", "Tamil"
    },
    code: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true   // ISO 639-1 e.g. "en", "hi", "ta"
    },
    native_name: {
        type: String,
        default: '' // e.g. "हिन्दी", "தமிழ்"
    },
    is_active: {
        type: Boolean,
        default: true
    },
    direction: {
        type: String,
        enum: ['ltr', 'rtl'],
        default: 'ltr'
    },
    translations: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Language', languageSchema);
