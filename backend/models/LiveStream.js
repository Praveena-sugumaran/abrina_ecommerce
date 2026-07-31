const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const liveStreamSchema = new mongoose.Schema({
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    slug: { type: String, unique: true, lowercase: true, index: true, sparse: true },
    description: { type: String, default: '' },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    thumbnail: { type: String, default: '' },
    status: { type: String, enum: ['upcoming', 'live', 'ended'], default: 'upcoming' },
    start_time: { type: Date, default: Date.now },
    end_time: { type: Date },

    // Stream Provider configuration
    stream_provider: { 
        type: String, 
        enum: ['youtube', 'custom', 'mock', 'zegocloud'], 
        default: 'mock' 
    },
    stream_key: { type: String, required: true },
    stream_key_hash: { type: String }, // Hashed stream key for security verification
    playback_url: { type: String, default: '' },
    rtmp_url: { type: String, default: '' },

    // Viewer Statistics
    viewer_count: { type: Number, default: 0 },
    peak_viewers: { type: Number, default: 0 },

    // Replay Metadata
    recording_url: { type: String, default: '' },
    recording_duration: { type: Number, default: 0 }, // in seconds
    recording_size: { type: Number, default: 0 }, // in bytes

    // Showcase Items
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    // Live Pinned Product
    pinned_product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },

    // Live Active Poll
    active_poll: {
        question: { type: String },
        options: [{
            text: { type: String },
            votes: { type: Number, default: 0 }
        }]
    },

    // Analytical Counters
    total_quotes: { type: Number, default: 0 },
    total_messages: { type: Number, default: 0 },
    total_watch_time: { type: Number, default: 0 }
}, { timestamps: true });

// Pre-save hook to generate a slug from the title and hash stream key
liveStreamSchema.pre('save', async function () {
    if ((this.isNew || this.isModified('title')) && this.title) {
        let baseSlug = this.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
            
        const suffix = this._id ? this._id.toString().substring(18) : Math.random().toString(36).substring(2, 8);
        this.slug = `${baseSlug}-${suffix}`;
    }
    if (this.isModified('stream_key') && this.stream_key) {
        const salt = await bcrypt.genSalt(10);
        this.stream_key_hash = await bcrypt.hash(this.stream_key, salt);
    }
});

module.exports = mongoose.model('LiveStream', liveStreamSchema);
