const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo';
        await mongoose.connect(mongoUri);
        
        const db = mongoose.connection.db;
        const settingsCollection = db.collection('sitesettings');
        
        const settings = await settingsCollection.findOne({});
        console.log('Site Settings:', JSON.stringify(settings, null, 2));
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
