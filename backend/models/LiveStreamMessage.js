const mongoose = require('mongoose');

const liveStreamMessageSchema = new mongoose.Schema({
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user_name: { type: String, required: true },
    message: { type: String, required: true },
    translated_message: { type: String, default: '' },
    language: { type: String, default: 'English' },
    reply_to_message_id: { type: String, default: null },
    reply_to_user_name: { type: String, default: null },
    reply_to_content: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('LiveStreamMessage', liveStreamMessageSchema);
