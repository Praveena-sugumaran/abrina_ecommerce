const mongoose = require('mongoose');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixAndExpire() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo');
        
        const buyer = await User.findOne({ email: 'testbuyer@example.com' });
        const plan = await SubscriptionPlan.findOne({ name: '24-Hour Buyer Pass' });

        if (buyer && plan) {
            // Set to 1 hour ago (Expired)
            const pastDate = new Date();
            pastDate.setHours(pastDate.getHours() - 1);

            buyer.subscription_plan = plan._id;
            buyer.subscription_start = new Date(pastDate.getTime() - 24*60*60*1000);
            buyer.subscription_end = pastDate;
            await buyer.save();
            
            console.log(`\n✅ FORCED EXPIRY: User ${buyer.email} now has an EXPIRED "${plan.name}" plan.`);
            console.log(`   Expiry Time was: ${pastDate.toLocaleString()}`);
            console.log(`\n🚀 ACTION: You can now log in with ${buyer.email} and try AI Sourcing. It should BLOCK you.`);
        }

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

fixAndExpire();
