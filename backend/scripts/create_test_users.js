const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const createTestUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo');
        console.log('Connected to DB...');

        const password = await bcrypt.hash('password123', 10);

        const users = [
            {
                first_name: 'Test',
                last_name: 'Buyer',
                email: 'testbuyer@example.com',
                password: 'password123',
                role: 'buyer',
                is_active: true
            },
            {
                first_name: 'Test',
                last_name: 'Supplier',
                email: 'testsupplier@example.com',
                password: 'password123',
                role: 'seller',
                company_name: 'One Day Test Corp',
                is_active: true
            }
        ];

        for (const userData of users) {
             const existing = await User.findOne({ email: userData.email });
             if (existing) {
                 await User.deleteOne({ _id: existing._id });
             }
             await User.create(userData);
        }

        console.log('✅ Test users created successfully!');
        console.log('Buyer: testbuyer@example.com / password123');
        console.log('Supplier: testsupplier@example.com / password123');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating test users:', err);
        process.exit(1);
    }
};

createTestUsers();
