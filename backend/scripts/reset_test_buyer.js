const mongoose = require('mongoose');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function resetToActive() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo');
        
        const buyer = await User.findOne({ email: 'testbuyer@example.com' });
        const plan = await SubscriptionPlan.findOne({ name: '24-Hour Buyer Pass' });

        if (buyer && plan) {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 24);

            buyer.subscription_plan = plan._id;
            buyer.subscription_start = now;
            buyer.subscription_end = futureDate;
            buyer.ai_tasks_count = 0; // Reset usage
            await buyer.save();
            
            console.log(`\n✅ RESET SUCCESS: User ${buyer.email} now has an ACTIVE "24-Hour Buyer Pass".`);
            console.log(`   Expiry Time: ${futureDate.toLocaleString()}`);
            console.log(`\n🚀 ACTION: You can now log in and use AI Sourcing / Chat freely.`);
        }

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

resetToActive();
