const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const SiteSetting = require('./models/SiteSetting');

async function test() {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected!");
    
    console.log("Running SiteSetting query...");
    console.time("SiteSetting");
    const settings = await SiteSetting.findOne();
    console.timeEnd("SiteSetting");
    console.log(`Found settings:`, settings ? {
        is_installed: settings.is_installed,
        license_status: settings.license_status
    } : "No");
    
    await mongoose.connection.close();
    console.log("Done!");
}

test().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
