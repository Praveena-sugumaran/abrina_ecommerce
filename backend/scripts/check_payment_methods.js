const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PaymentSetting = require('../models/PaymentSetting');

dotenv.config();

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const providers = ['stripe', 'paypal', 'razorpay', 'bank'];
        for (const provider of providers) {
            let setting = await PaymentSetting.findOne({ provider });
            if (!setting) {
                console.log(`Creating setting for ${provider}...`);
                setting = await PaymentSetting.create({
                    provider,
                    enable: true,
                    live_mode: false,
                    public_key: `pk_test_${provider}_mock_key`,
                    secret_key: `sk_test_${provider}_mock_key`
                });
            } else {
                console.log(`Setting for ${provider} exists. Enabling it...`);
                setting.enable = true;
                await setting.save();
            }
        }

        const enabled = await PaymentSetting.find({ enable: true });
        console.log('Currently enabled payment methods in database:');
        enabled.forEach(e => {
            console.log(`- ${e.provider} (Enabled: ${e.enable})`);
        });

        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Error running setup script:', err);
        process.exit(1);
    }
};

run();
