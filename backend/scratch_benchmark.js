const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Company = require('./models/Company');
const Order = require('./models/Order');

async function benchmark() {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected!");

    // Time getAdminStats queries
    console.log("\n--- Benchmarking getAdminStats queries ---");

    const t0 = Date.now();
    await Promise.all([
        User.countDocuments(),
        User.countDocuments({ roles: 'buyer' }),
        User.countDocuments({ roles: 'supplier' }),
        User.countDocuments({ roles: 'admin' })
    ]);
    console.log(`1. User count documents: ${Date.now() - t0}ms`);

    const t1 = Date.now();
    await Promise.all([
        Product.countDocuments(),
        Category.countDocuments(),
        Company.countDocuments(),
        Company.countDocuments({ verification_status: 'pending' }),
        Order.countDocuments()
    ]);
    console.log(`2. General counts: ${Date.now() - t1}ms`);

    const t2 = Date.now();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    await User.countDocuments({ createdAt: { $gte: startOfToday } });
    await User.countDocuments({ roles: 'buyer', createdAt: { $gte: startOfToday } });
    await User.countDocuments({ roles: 'supplier', createdAt: { $gte: startOfToday } });
    await Product.countDocuments({ createdAt: { $gte: startOfToday } });
    console.log(`3. Today counts: ${Date.now() - t2}ms`);

    const t3 = Date.now();
    await Order.aggregate([
        { $match: { payment_status: 'paid', createdAt: { $gte: startOfToday } } },
        { 
            $group: { 
                _id: null, 
                count: { $sum: 1 }, 
                earnings: { $sum: "$total_amount" } 
            } 
        }
    ]);
    console.log(`4. Today order stats aggregation: ${Date.now() - t3}ms`);

    const t4 = Date.now();
    await Order.aggregate([
        { $match: { payment_status: 'paid' } },
        {
            $group: {
                _id: null,
                totalVolume: { $sum: "$total_amount" },
                transactionFees: { $sum: "$service_fee" }
            }
        }
    ]);
    console.log(`5. Financial stats aggregation: ${Date.now() - t4}ms`);

    const t5 = Date.now();
    const promotedProducts = await Product.find({ isPromoted: true });
    console.log(`6. Promoted products query: ${Date.now() - t5}ms`);

    const t6 = Date.now();
    await User.aggregate([
        { $match: { subscription_plan: { $ne: null } } },
        {
            $lookup: {
                from: 'subscriptionplans',
                localField: 'subscription_plan',
                foreignField: '_id',
                as: 'plan'
            }
        },
        { $unwind: '$plan' },
        { $group: { _id: null, total: { $sum: '$plan.price' } } }
    ]);
    console.log(`7. Subscription stats aggregation: ${Date.now() - t6}ms`);

    const t7 = Date.now();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    await Order.aggregate([
        { $match: { payment_status: 'paid', createdAt: { $gte: firstDayOfMonth } } },
        {
            $group: {
                _id: null,
                volume: { $sum: "$total_amount" },
                fees: { $sum: "$service_fee" }
            }
        }
    ]);
    console.log(`8. This month stats aggregation: ${Date.now() - t7}ms`);

    const t8 = Date.now();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    await Order.aggregate([
        {
            $match: {
                payment_status: 'paid',
                createdAt: { $gte: sixMonthsAgo }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                },
                monthlyVolume: { $sum: "$total_amount" }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    console.log(`9. Monthly aggregation for growth chart: ${Date.now() - t8}ms`);

    console.log("\n--- Benchmarking getAdminCompanies queries ---");
    const t9 = Date.now();
    await Company.find()
        .populate('user_id', 'first_name last_name email role status payout_methods')
        .sort({ createdAt: -1 });
    console.log(`Company find with populate: ${Date.now() - t9}ms`);

    await mongoose.connection.close();
    console.log("\nDone!");
}

benchmark().catch(err => {
    console.error("Benchmark failed:", err);
    process.exit(1);
});
