const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PaymentSetting = require('../models/PaymentSetting');

dotenv.config();

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        // Delete or disable the bank provider setting
        const result = await PaymentSetting.deleteOne({ provider: 'bank' });
        console.log(`Deleted bank provider setting:`, result);

        const enabled = await PaymentSetting.find({ enable: true });
        console.log('Currently enabled payment methods in database:');
        enabled.forEach(e => {
            console.log(`- ${e.provider} (Enabled: ${e.enable})`);
        });

        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

run();
