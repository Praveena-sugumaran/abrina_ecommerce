const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo';
        await mongoose.connect(mongoUri);
        
        const db = mongoose.connection.db;
        const streamsCollection = db.collection('livestreams');
        
        const activeStreams = await streamsCollection.find({ status: 'live' }).toArray();
        console.log('Active streams:', JSON.stringify(activeStreams, null, 2));

        const allStreams = await streamsCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray();
        console.log('Recent 5 streams:', JSON.stringify(allStreams, null, 2));
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
