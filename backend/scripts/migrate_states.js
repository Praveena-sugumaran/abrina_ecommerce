const mongoose = require('mongoose');
const State = require('../models/State');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const migrateStates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo');
        console.log('Connected to DB...');

        // Find all states using raw collection to see original field names
        const db = mongoose.connection.db;
        const statesCollection = db.collection('states');
        
        const allStates = await statesCollection.find({}).toArray();
        console.log(`Found ${allStates.length} states.`);

        let updatedCount = 0;
        for (const state of allStates) {
            if (state.country_id && !state.country) {
                await statesCollection.updateOne(
                    { _id: state._id },
                    { 
                        $set: { country: state.country_id },
                        $unset: { country_id: "" }
                    }
                );
                updatedCount++;
            }
        }

        console.log(`✅ Migration complete. Updated ${updatedCount} states.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrateStates();
