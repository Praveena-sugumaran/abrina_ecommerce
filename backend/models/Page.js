const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true }, // Markdown or HTML
    isPublished: { type: Boolean, default: true },
    metaDescription: String
}, { timestamps: true });

module.exports = mongoose.model('Page', pageSchema);
