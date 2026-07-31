const User = require('../models/User');
const Product = require('../models/Product');
const RFQ = require('../models/RFQ');

/**
 * Runs periodic maintenance tasks:
 * 1. Expire subscriptions
 * 2. Clear expired product promotions
 * 3. Clear expired RFQ boosts
 */
exports.runMaintenance = async () => {
    try {
        const now = new Date();

        // 1. Expire User Subscriptions
        const expiredUsers = await User.updateMany(
            { subscription_end: { $lt: now }, subscription_plan: { $ne: null } },
            { $set: { subscription_plan: null, subscription_start: null, subscription_end: null, plan_active: false, subscription_status: 'expired' } }
        );
        if (expiredUsers.modifiedCount > 0) console.log(`🧹 Expired ${expiredUsers.modifiedCount} user subscriptions.`);

        // 2. Expire Product Promotions
        const expiredProducts = await Product.updateMany(
            { promotion_expires: { $lt: now }, isPromoted: true },
            { $set: { isPromoted: false, promotion_expires: null } }
        );
        if (expiredProducts.modifiedCount > 0) console.log(`🧹 Expired ${expiredProducts.modifiedCount} product promotions.`);

        // 3. Expire RFQ Boosts
        const expiredRFQs = await RFQ.updateMany(
            { promotion_expires: { $lt: now }, isPromoted: true },
            { $set: { isPromoted: false, promotion_expires: null } }
        );
        if (expiredRFQs.modifiedCount > 0) console.log(`🧹 Expired ${expiredRFQs.modifiedCount} RFQ boosts.`);

    } catch (err) {
        console.error('Maintenance error:', err);
    }
};
