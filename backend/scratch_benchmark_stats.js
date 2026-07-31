const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Company = require('./models/Company');
const Order = require('./models/Order');

async function benchmark() {
    console.log('Connecting to database...');
    const startConnect = Date.now();
    await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000
    });
    console.log(`Database connected in ${Date.now() - startConnect}ms\n`);

    const runQuery = async (name, queryFn) => {
        const start = Date.now();
        try {
            await queryFn();
            console.log(`⏱️  [${name}] passed in ${Date.now() - start}ms`);
        } catch (err) {
            console.error(`❌ [${name}] failed in ${Date.now() - start}ms:`, err.message);
        }
    };

    // 1. User counts
    await runQuery('User count (total)', () => User.countDocuments());
    await runQuery('User count (buyer)', () => User.countDocuments({ roles: 'buyer' }));
    await runQuery('User count (supplier)', () => User.countDocuments({ roles: 'supplier' }));
    await runQuery('User count (admin)', () => User.countDocuments({ roles: 'admin' }));

    // 2. Other counts
    await runQuery('Product count', () => Product.countDocuments());
    await runQuery('Category count', () => Category.countDocuments());
    await runQuery('Company count (total)', () => Company.countDocuments());
    await runQuery('Company count (pending)', () => Company.countDocuments({ verification_status: 'pending' }));
    await runQuery('Order count', () => Order.countDocuments());

    // 3. Today's counts
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    await runQuery('Today user count', () => User.countDocuments({ createdAt: { $gte: startOfToday } }));
    await runQuery('Today buyer count', () => User.countDocuments({ roles: 'buyer', createdAt: { $gte: startOfToday } }));
    await runQuery('Today supplier count', () => User.countDocuments({ roles: 'supplier', createdAt: { $gte: startOfToday } }));
    await runQuery('Today product count', () => Product.countDocuments({ createdAt: { $gte: startOfToday } }));

    // 4. Aggregations
    await runQuery('Today order stats aggregation', () => Order.aggregate([
        { $match: { payment_status: 'paid', createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, count: { $sum: 1 }, earnings: { $sum: "$total_amount" } } }
    ]));

    await runQuery('Financial stats aggregation', () => Order.aggregate([
        { $match: { payment_status: 'paid' } },
        { $group: { _id: null, totalVolume: { $sum: "$total_amount" }, transactionFees: { $sum: "$service_fee" } } }
    ]));

    await runQuery('Promoted products find', () => Product.find({ isPromoted: true }));

    await runQuery('Subscription stats aggregation', () => User.aggregate([
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
    ]));

    await runQuery('This month stats aggregation', () => Order.aggregate([
        { $match: { payment_status: 'paid', createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } } },
        { $group: { _id: null, volume: { $sum: "$total_amount" }, fees: { $sum: "$service_fee" } } }
    ]));

    await runQuery('6-Month rolling stats aggregation', () => Order.aggregate([
        { $match: { payment_status: 'paid', createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
        {
            $group: {
                _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                monthlyVolume: { $sum: "$total_amount" }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]));

    await mongoose.disconnect();
    console.log('\nBenchmark completed successfully!');
}

benchmark();
