const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ override: true });

const connectDB = require('./config/db');
const Category = require('./models/Category');

async function testModel() {
    try {
        await connectDB();
        console.log("Connected database name:", mongoose.connection.db.databaseName);
        
        const count = await Category.countDocuments({});
        console.log("Category count via Mongoose Category model:", count);
        
        const allCats = await Category.find({}).limit(2).toArray ? await Category.find({}).limit(2).toArray() : await Category.find({}).limit(2);
        console.log("Categories:", allCats.map(c => c.title));
        
        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}

testModel();
