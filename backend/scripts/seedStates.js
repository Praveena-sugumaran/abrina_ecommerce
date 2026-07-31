const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Country = require('../models/Country');
const State = require('../models/State');

// Load env vars
dotenv.config({ path: '.env' });

const seedStates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('MongoDB Connected...');

        const india = await Country.findOne({ code: 'IN' });
        const us = await Country.findOne({ code: 'US' });
        const china = await Country.findOne({ code: 'CN' });

        const statesData = [];

        if (india) {
            statesData.push(
                { name: 'Maharashtra', code: 'MH', country: india._id },
                { name: 'Delhi', code: 'DL', country: india._id },
                { name: 'Karnataka', code: 'KA', country: india._id },
                { name: 'Gujarat', code: 'GJ', country: india._id },
                { name: 'Tamil Nadu', code: 'TN', country: india._id }
            );
        }

        if (us) {
            statesData.push(
                { name: 'California', code: 'CA', country: us._id },
                { name: 'New York', code: 'NY', country: us._id },
                { name: 'Texas', code: 'TX', country: us._id },
                { name: 'Florida', code: 'FL', country: us._id },
                { name: 'Illinois', code: 'IL', country: us._id }
            );
        }

        if (china) {
            statesData.push(
                { name: 'Guangdong', code: 'GD', country: china._id },
                { name: 'Zhejiang', code: 'ZJ', country: china._id },
                { name: 'Jiangsu', code: 'JS', country: china._id },
                { name: 'Shandong', code: 'SD', country: china._id },
                { name: 'Sichuan', code: 'SC', country: china._id }
            );
        }

        if (statesData.length > 0) {
            // clear existing states
            await State.deleteMany({});
            await State.insertMany(statesData);
            console.log('States seeded successfully!');
        } else {
            console.log('No countries found. Please seed countries first.');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedStates();
