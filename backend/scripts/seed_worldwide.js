const mongoose = require('mongoose');
const Country = require('../models/Country');
const State = require('../models/State');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedWorldwide = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo');
        console.log('Connected to DB...');

        const countries = [
            { name: 'China', code: 'CN', dial_code: '+86', currency: 'CNY', flag: '🇨🇳' },
            { name: 'India', code: 'IN', dial_code: '+91', currency: 'INR', flag: '🇮🇳' },
            { name: 'United States', code: 'US', dial_code: '+1', currency: 'USD', flag: '🇺🇸' },
            { name: 'Canada', code: 'CA', dial_code: '+1', currency: 'CAD', flag: '🇨🇦' },
            { name: 'United Kingdom', code: 'GB', dial_code: '+44', currency: 'GBP', flag: '🇬🇧' }
        ];

        for (const c of countries) {
            await Country.findOneAndUpdate(
                { code: c.code },
                { ...c, status: 'Active' },
                { upsert: true, new: true }
            );
        }
        console.log('✅ Countries seeded/updated.');

        const cn = await Country.findOne({ code: 'CN' });
        const ind = await Country.findOne({ code: 'IN' });
        const us = await Country.findOne({ code: 'US' });

        const states = [
            { name: 'Guangdong', code: 'GD', country: cn._id },
            { name: 'Zhejiang', code: 'ZJ', country: cn._id },
            { name: 'Jiangsu', code: 'JS', country: cn._id },
            { name: 'Maharashtra', code: 'MH', country: ind._id },
            { name: 'Karnataka', code: 'KA', country: ind._id },
            { name: 'Gujarat', code: 'GJ', country: ind._id },
            { name: 'California', code: 'CA', country: us._id },
            { name: 'Texas', code: 'TX', country: us._id },
            { name: 'New York', code: 'NY', country: us._id }
        ];

        for (const s of states) {
            await State.findOneAndUpdate(
                { name: s.name, country: s.country },
                s,
                { upsert: true, new: true }
            );
        }
        console.log('✅ States seeded.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding:', err);
        process.exit(1);
    }
};

seedWorldwide();
