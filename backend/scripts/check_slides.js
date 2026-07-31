const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");
    const db = mongoose.connection.db;
    
    const count = await db.collection('heroslides').countDocuments();
    console.log(`Found ${count} hero slides.`);
    
    if (count > 0) {
        const slides = await db.collection('heroslides').find().toArray();
        slides.forEach((slide, idx) => {
            console.log(`--- Slide ${idx + 1} (${slide._id}) ---`);
            console.log(JSON.stringify(slide, null, 2));
        });
    } else {
        console.log("No slides in database.");
    }
    
    await mongoose.disconnect();
}

main().catch(console.error);
