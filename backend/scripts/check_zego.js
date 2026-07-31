const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const SiteSetting = require('../models/SiteSetting');

async function checkSettings() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_clone');
        console.log('Connected to MongoDB');
        const settings = await SiteSetting.findOne();
        if (!settings) {
            console.log('No SiteSettings document found!');
        } else {
            console.log('SiteSettings Document:');
            console.log('zego_app_id:', settings.zego_app_id);
            console.log('zego_server_secret:', settings.zego_server_secret);
            console.log('zego_app_sign:', settings.zego_app_sign);
            console.log('live_stream_enabled:', settings.live_stream_enabled);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSettings();
