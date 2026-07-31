const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true   // e.g. "Indian Rupee", "US Dollar"
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true   // e.g. "INR", "USD"
    },
    symbol: {
        type: String,
        required: true,
        trim: true   // e.g. "₹", "$"
    },
    exchange_rate: {
        type: Number,
        required: true,
        default: 1   // Base currency is USD = 1
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Currency', currencySchema);
