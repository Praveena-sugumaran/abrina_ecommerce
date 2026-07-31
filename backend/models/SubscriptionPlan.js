const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., Free, Gold, Verified, Premium
    plan_type: { type: String, enum: ['supplier', 'buyer'], default: 'supplier' }, // supplier or buyer plan
    price: { type: Number, required: true },
    duration_value: { type: Number, required: true }, // e.g., 1, 12
    duration_type: { type: String, enum: ['day', 'month', 'year'], default: 'month' },
    tagline: { type: String, default: '' }, // For buyer: used as "AI Mode tasks" line e.g. "200 AI Mode tasks per month"
    description: { type: String },
    features: [{ type: String }],
    is_recommended: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    level: { type: Number, default: 1 }, // 1=Free, 2=Starter, 3=Pro, 4=Premium
    badge_color: { type: String, default: '#ccc' }, // for UI
    badge_icon: { type: String, default: '' }, // URL or icon key

    // ── SUPPLIER-SPECIFIC FIELDS ───────────────────────────────────
    max_products: { type: Number, default: 10 },             // 0 or -1 = unlimited
    max_images_per_product: { type: Number, default: 5 },    // 0 or -1 = unlimited
    max_showcases: { type: Number, default: 0 },
    max_rfq_responses: { type: Number, default: 10 },
    has_analytics: { type: Boolean, default: false },
    has_verified_badge: { type: Boolean, default: false },   // Verified Pro badge

    // ── BUYER-SPECIFIC FIELDS ──────────────────────────────────────
    max_ai_tasks: { type: Number, default: 10 },             // AI mode tasks per day/month; -1 = unlimited
    max_inquiries: { type: Number, default: -1 },            // Inquiries per month; -1 = unlimited
    max_rfqs: { type: Number, default: -1 },                 // RFQs posted per month; -1 = unlimited
    has_priority_support: { type: Boolean, default: false },
    has_partner_data: { type: Boolean, default: false },     // Exclusive partner data access

}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
