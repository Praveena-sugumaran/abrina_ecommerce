const mongoose = require('mongoose');

const aiHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    query_text: {
        type: String,
        required: true,
        trim: true
    },
    search_type: {
        type: String,
        enum: ['product', 'supplier', 'manufacturer', 'trending', 'design'],
        default: 'product'
    },
    results_count: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['completed', 'processing', 'failed'],
        default: 'completed'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AiHistory', aiHistorySchema);
