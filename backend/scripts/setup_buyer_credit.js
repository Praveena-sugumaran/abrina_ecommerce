const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const BusinessCredit = require('../models/BusinessCredit');

dotenv.config();

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const email = 'buyer@gmail.com';
        let user = await User.findOne({ email });
        
        if (!user) {
            console.log(`User ${email} not found. Creating a default buyer account...`);
            user = await User.create({
                first_name: 'Sarah',
                last_name: 'Supplier',
                email: email,
                password: 'password123',
                roles: ['buyer'],
                wallet_balance: 10000
            });
            console.log(`Created user ${email}`);
        } else {
            console.log(`User ${email} exists.`);
        }

        // Set wallet balance to a high amount ($10,000) so they can repay
        user.wallet_balance = 10000;
        await user.save();
        console.log(`Set wallet_balance for ${email} to $10,000.`);

        // Find or create BusinessCredit profile for this user
        let credit = await BusinessCredit.findOne({ buyer_id: user._id });
        if (!credit) {
            console.log(`Creating business credit profile for ${email}...`);
            credit = await BusinessCredit.create({
                buyer_id: user._id,
                credit_limit: 10000,
                available_credit: 9500,
                used_credit: 500, // outstanding balance
                net_days: 60,
                status: 'active'
            });
        } else {
            console.log(`Credit profile exists. Updating outstanding balance and status...`);
            credit.credit_limit = 10000;
            credit.used_credit = 500; // outstanding balance
            credit.available_credit = 9500;
            credit.status = 'active';
            credit.net_days = 60;
            await credit.save();
        }

        console.log('Updated credit profile details:');
        console.log(`- Approved Limit: $${credit.credit_limit}`);
        console.log(`- Available Limit: $${credit.available_credit}`);
        console.log(`- Outstanding Balance: $${credit.used_credit}`);
        console.log(`- Status: ${credit.status}`);

        mongoose.connection.close();
        console.log('Setup script executed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error running setup script:', err);
        process.exit(1);
    }
};

run();
