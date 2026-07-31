const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema({
    tag: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    cta1_label: { type: String, required: true, default: 'Get Quotes Now' },
    cta1_link: { type: String, required: true, default: '/rfq/post' },
    cta1_needsAuth: { type: Boolean, default: false },
    cta1_variant: { type: String, enum: ['primary', 'secondary', 'outline'], default: 'primary' },
    cta2_label: { type: String, required: true, default: 'Start Selling' },
    cta2_link: { type: String, required: true, default: '/become-supplier' },
    cta2_variant: { type: String, enum: ['primary', 'secondary', 'outline'], default: 'outline' },
    accent: { type: String, default: '#ff6600' },
    gradFrom: { type: String, default: '#0a1f4e' },
    gradMid: { type: String, default: '#0d2e67' },
    gradTo: { type: String, default: '#14408a' },
    shape1: { type: String, default: '#1a4a9e' },
    shape2: { type: String, default: '#ff6600' },
    statLabel: { type: String, default: '40M+ Products' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    priority: { type: Number, default: 0 },
    image: { type: String, default: '' },
    mobileImage: { type: String, default: '' },
    textAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
    discountText: { type: String, default: '' },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaleCampaign', default: null },
    featuresText: { type: String, default: '' },
    translations: { type: mongoose.Schema.Types.Mixed, default: {} },
    textColor: { type: String, enum: ['light', 'dark'], default: 'light' },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
}, {
    timestamps: true
});

module.exports = mongoose.model('HeroSlide', heroSlideSchema);
