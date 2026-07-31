const mongoose = require('mongoose');

const streamAdvertisementSchema = new mongoose.Schema({
    advertiser_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream' },
    ad_type: { 
        type: String, 
        enum: ['pre-roll', 'banner', 'overlay', 'sponsored'], 
        default: 'banner' 
    },
    image_url: { type: String, default: '' },
    destination_url: { type: String, default: '' },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('StreamAdvertisement', streamAdvertisementSchema);
