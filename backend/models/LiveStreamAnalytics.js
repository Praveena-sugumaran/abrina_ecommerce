const mongoose = require('mongoose');

const liveStreamAnalyticsSchema = new mongoose.Schema({
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true, unique: true },
    peak_viewers: { type: Number, default: 0 },
    watch_time: { type: Number, default: 0 }, // in total viewer minutes
    chat_messages: { type: Number, default: 0 },
    quote_requests: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('LiveStreamAnalytics', liveStreamAnalyticsSchema);
