const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 15000, // Timeout after 15s instead of default
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Clean up legacy unique index on 'username' if it exists in the DB
        try {
            const db = conn.connection.db;
            const collections = await db.listCollections({ name: 'users' }).toArray();
            if (collections.length > 0) {
                // Check if index exists before dropping
                const indexes = await db.collection('users').listIndexes().toArray();
                if (indexes.some(idx => idx.name === 'username_1')) {
                    await db.collection('users').dropIndex('username_1');
                    console.log('Stray username_1 index dropped successfully');
                }
            }
        } catch (err) {
            console.warn('Note: username_1 index cleanup check skipped or not needed.');
        }
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        // Re-throw to prevent server from starting in a broken state for DB-dependent features
        throw error;
    }
};

module.exports = connectDB;
