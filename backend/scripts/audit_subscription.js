const mongoose = require('mongoose');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Product = require('../models/Product');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkSystem() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo');
        console.log('\n--- 🧪 SUBSCRIPTION SYSTEM AUDIT 🧪 ---');

        // 1. Check Plans
        const plans = await SubscriptionPlan.find({ duration_type: 'day' });
        console.log(`\n1. One-Day Plans Found: ${plans.length}`);
        plans.forEach(p => console.log(`   - [${p.plan_type.toUpperCase()}] ${p.name}: $${p.price} (Dur: ${p.duration_value} ${p.duration_type})`));

        // 2. Check Test Users
        const buyer = await User.findOne({ email: 'testbuyer@example.com' }).populate('subscription_plan');
        const supplier = await User.findOne({ email: 'testsupplier@example.com' }).populate('subscription_plan');

        console.log('\n2. Test User Status:');
        console.log(`   - Buyer (${buyer?.email}): Plan: ${buyer?.subscription_plan?.name || 'None'}, End: ${buyer?.subscription_end || 'N/A'}`);
        console.log(`   - Supplier (${supplier?.email}): Plan: ${supplier?.subscription_plan?.name || 'None'}, End: ${supplier?.subscription_end || 'N/A'}`);

        // 3. Test Purchase Simulation (Buyer)
        if (buyer && plans.find(p => p.plan_type === 'buyer')) {
            const plan = plans.find(p => p.plan_type === 'buyer');
            const now = new Date();
            const end = new Date();
            end.setHours(end.getHours() + 24);

            buyer.subscription_plan = plan._id;
            buyer.subscription_start = now;
            buyer.subscription_end = end;
            buyer.ai_tasks_count = 0;
            await buyer.save();
            console.log(`\n3. [Simulation] Assigned "${plan.name}" to Buyer. Expiring in 24 hours.`);
        }

        // 4. Test Expiry Enforcement (Logic Check)
        const expiredBuyer = await User.findOne({ email: 'testbuyer@example.com' }).populate('subscription_plan');
        const isExpired = expiredBuyer.subscription_end && new Date() > expiredBuyer.subscription_end;
        console.log(`\n4. Expiry Logic Test:
           - End Date: ${expiredBuyer.subscription_end}
           - Current Time: ${new Date()}
           - Is Expired? ${isExpired ? '❌ YES (Blocked)' : '✅ NO (Active)'}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSystem();
