const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const EmiPlan = require('../models/EmiPlan');

async function seedPlans() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const count = await EmiPlan.countDocuments();
        console.log(`Current EMI Plan count: ${count}`);

        if (count === 0) {
            console.log('No EMI plans found, seeding defaults...');
            const defaultPlans = [
                {
                    name: '3 Months Short-Term EMI',
                    installments: 3,
                    interest_rate: 1.5,
                    processing_fee: 10,
                    min_order_amount: 100,
                    max_order_amount: 5000,
                    is_active: true
                },
                {
                    name: '6 Months Standard EMI',
                    installments: 6,
                    interest_rate: 2.0,
                    processing_fee: 15,
                    min_order_amount: 500,
                    max_order_amount: 10000,
                    is_active: true
                },
                {
                    name: '12 Months Long-Term EMI',
                    installments: 12,
                    interest_rate: 2.5,
                    processing_fee: 25,
                    min_order_amount: 1000,
                    max_order_amount: 50000,
                    is_active: true
                }
            ];
            await EmiPlan.insertMany(defaultPlans);
            console.log('Successfully seeded default EMI plans!');
        } else {
            console.log('EMI plans already exist. Skipping seed.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error seeding EMI plans:', err);
        process.exit(1);
    }
}

seedPlans();
