const mongoose = require('mongoose');

const topRankingItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    score: { type: String, required: true },
    img: { type: String, required: true }
});

const topRankingSchema = new mongoose.Schema({
    category: { type: String, required: true },
    country: { type: String, required: true },
    flag: { type: String, required: true },
    items: [topRankingItemSchema],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('TopRanking', topRankingSchema);
