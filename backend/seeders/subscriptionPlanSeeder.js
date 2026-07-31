const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SubscriptionPlan = require('../models/SubscriptionPlan');

// Load env vars
dotenv.config({ path: '../.env' });
if (!process.env.MONGO_URI) {
    dotenv.config({ path: './.env' });
}

const seedPlans = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo');

        console.log('Cleaning existing plans...');
        await SubscriptionPlan.deleteMany();

        const plans = [
            // ── BUYER PLANS ─────────────────────────────────────────
            {
                name: 'Free',
                plan_type: 'buyer',
                price: 0,
                duration_value: 1,
                duration_type: 'month',
                tagline: '10 AI Mode tasks per day',
                description: 'Basic sourcing for individuals',
                level: 1,
                badge_color: '#9ca3af',
                max_ai_tasks: 300, // 10 * 30
                max_inquiries: -1,
                features: [
                    'Unlimited inquiries',
                    'Standard processing speed'
                ],
                is_active: true
            },
            {
                name: 'Starter',
                plan_type: 'buyer',
                price: 429.95,
                duration_value: 1,
                duration_type: 'month',
                tagline: '200 AI Mode tasks per month',
                description: 'For growing businesses',
                level: 2,
                badge_color: '#111827',
                max_ai_tasks: 200,
                max_inquiries: -1,
                has_priority_support: true,
                features: [
                    'Unlimited inquiries',
                    'Faster processing speed',
                    'Exclusive access to partner data',
                    'Product design generation',
                    'Trend and bestseller analysis',
                    'Priority support'
                ],
                is_active: true
            },
            {
                name: 'Pro',
                plan_type: 'buyer',
                price: 859.95,
                duration_value: 1,
                duration_type: 'month',
                tagline: '400 AI Mode tasks per month',
                description: 'Complete sourcing solution',
                level: 3,
                badge_color: '#ff6b35',
                max_ai_tasks: 400,
                max_inquiries: -1,
                has_priority_support: true,
                has_partner_data: true,
                is_recommended: true,
                features: [
                    'Unlimited inquiries',
                    'Premium processing speed',
                    'Exclusive access to partner data',
                    'Product design generation',
                    'Trend and bestseller analysis',
                    'Early access to new features'
                ],
                is_active: true
            },

            // ── SUPPLIER PLANS ──────────────────────────────────────
            {
                name: 'Basic',
                plan_type: 'supplier',
                price: 119000,
                duration_value: 1,
                duration_type: 'year',
                tagline: 'Get started with global selling',
                description: 'Essential supplier features',
                level: 1,
                badge_color: '#0d2e67',
                max_products: -1,
                max_images_per_product: 10,
                max_showcases: 5,
                max_rfq_responses: 20,
                has_verified_badge: true,
                features: [
                    'Unlimited product posting',
                    'Business registration verified',
                    '5 product showcases',
                    'Access to Buyers Purchase Request (RFQ)'
                ],
                is_active: true
            },
            {
                name: 'Plus',
                plan_type: 'supplier',
                price: 172000,
                duration_value: 1,
                duration_type: 'year',
                tagline: 'Recommended for active exporters',
                description: 'Enhanced visibility and tools',
                level: 2,
                badge_color: '#0d2e67',
                max_products: -1,
                max_images_per_product: 15,
                max_showcases: 20,
                max_rfq_responses: 40,
                has_verified_badge: true,
                features: [
                    'All GGS Basics features',
                    '20 product showcases',
                    '40 RFQ quotas/month',
                    'Product advisor for 3 Months'
                ],
                is_active: true
            },
            {
                name: 'Pro',
                plan_type: 'supplier',
                price: 244000,
                duration_value: 1,
                duration_type: 'year',
                tagline: 'Maximum exposure and growth',
                description: 'The ultimate supplier package',
                level: 3,
                badge_color: '#7c3aed',
                max_products: -1,
                max_images_per_product: 30,
                max_showcases: 60,
                max_rfq_responses: 100,
                has_verified_badge: true,
                has_analytics: true,
                is_recommended: true,
                features: [
                    'All GGS Plus features',
                    'Product advisor for 6 Months',
                    '2-Star supplier rating direct for 6 Months',
                    'Keywords ads ranking service'
                ],
                is_active: true
            }
        ];

        await SubscriptionPlan.insertMany(plans);
        console.log('Successfully seeded subscription plans!');
        process.exit();
    } catch (error) {
        console.error('Error seeding plans:', error);
        process.exit(1);
    }
};

seedPlans();
