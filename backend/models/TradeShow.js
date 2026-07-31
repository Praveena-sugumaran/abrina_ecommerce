const mongoose = require('mongoose');

const tradeShowSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    event_date: { type: Date, required: true },
    organizer: { type: String, default: 'Alibaba Next Platform' },
    status: { type: String, enum: ['upcoming', 'active', 'ended'], default: 'upcoming' },
    halls: [{ type: String }] // lists of hall identifiers, e.g., 'Hall A - Tech', 'Hall B - Machinery'
}, { timestamps: true });

module.exports = mongoose.model('TradeShow', tradeShowSchema);
