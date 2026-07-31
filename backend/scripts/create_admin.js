const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo');
        console.log('Connected to DB...');

        const email = 'admin@example.com';
        const rawPassword = 'password123';
        
        let admin = await User.findOne({ email });

        if (admin) {
            console.log('Admin already exists, resetting password...');
            admin.password = rawPassword;
            admin.role = 'admin';
            admin.is_active = true;
            await admin.save();
        } else {
            console.log('Creating new Admin user...');
            admin = await User.create({
                first_name: 'Admin',
                last_name: 'User',
                email: email,
                password: rawPassword,
                role: 'admin',
                is_active: true
            });
        }

        console.log('✅ Admin user ready!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${rawPassword}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

createAdmin();
