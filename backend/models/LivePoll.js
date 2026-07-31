const mongoose = require('mongoose');

const livePollSchema = new mongoose.Schema({
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    votes: [{ type: Number, default: 0 }],
    user_votes: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        option_index: { type: Number }
    }]
}, { timestamps: true });

module.exports = mongoose.model('LivePoll', livePollSchema);
