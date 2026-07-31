const mongoose = require('mongoose');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedOneDayPlans = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo');
        console.log('Connected to DB...');

        const oneDayPlans = [
            {
                name: '24-Hour Buyer Pass',
                plan_type: 'buyer',
                price: 15.00,
                duration_value: 1,
                duration_type: 'day',
                tagline: '50 AI Tasks for 24 hours',
                description: 'Full access for a quick sourcing sprint',
                max_ai_tasks: 50,
                max_inquiries: 10,
                level: 2,
                badge_color: '#3b82f6',
                features: ['50 AI Sourcing Tasks', '10 Supplier Inquiries', 'Priority Support (24h)'],
                is_active: true
            },
            {
                name: '24-Hour Supplier Boost',
                plan_type: 'supplier',
                price: 99.00,
                duration_value: 1,
                duration_type: 'day',
                tagline: 'Unlimited items for 24 hours',
                description: 'Massively increase your inventory capacity for a day',
                max_products: 500,
                max_images_per_product: 20,
                max_showcases: 10,
                max_rfq_responses: 50,
                level: 2,
                badge_color: '#10b981',
                features: ['500 Product Slots', '10 Showcases', '50 RFQ Quotas'],
                is_active: true
            }
        ];

        for (const plan of oneDayPlans) {
            await SubscriptionPlan.findOneAndUpdate(
                { name: plan.name },
                plan,
                { upsert: true, new: true }
            );
        }

        console.log('✅ One-day plans seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding one-day plans:', err);
        process.exit(1);
    }
};

seedOneDayPlans();
