const mongoose = require('mongoose');

const liveRaiseHandSchema = new mongoose.Schema({
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true },
    buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    }
}, { timestamps: true });

module.exports = mongoose.model('LiveRaiseHand', liveRaiseHandSchema);
