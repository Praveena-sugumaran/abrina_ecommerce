const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const HeaderNavigation = require('../models/HeaderNavigation');

const clearDefaultNavLinks = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alibaba_demo';
        console.log('Connecting to MongoDB at:', uri);
        await mongoose.connect(uri);
        console.log('Connected to DB successfully!');

        console.log('Deleting existing header navigation links...');
        const result = await HeaderNavigation.deleteMany({});
        console.log(`Deleted ${result.deletedCount} links.`);

        console.log('✅ Header navigation clean up completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing header navigation links:', error);
        process.exit(1);
    }
};

clearDefaultNavLinks();
