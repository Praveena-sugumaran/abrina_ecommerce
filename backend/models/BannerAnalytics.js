const mongoose = require('mongoose');

const bannerAnalyticsSchema = new mongoose.Schema({
    bannerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HeroSlide',
        required: true,
        unique: true
    },
    impressions: {
        type: Number,
        default: 0
    },
    clicks: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('BannerAnalytics', bannerAnalyticsSchema);
