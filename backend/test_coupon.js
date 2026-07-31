const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Coupon = require('./models/Coupon');
const HomepageSection = require('./models/HomepageSection');

async function test() {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected!");
    
    console.log("Running HomepageSection query...");
    console.time("HomepageSection");
    const sections = await HomepageSection.find().sort({ order: 1 });
    console.timeEnd("HomepageSection");
    console.log(`Found ${sections.length} sections.`);
    
    console.log("Running Coupon existingDemo query...");
    console.time("CouponExisting");
    const demoCodes = ["WELCOME5", "FLASH50", "PREMIASAVE"];
    const existingDemo = await Coupon.find({ code: { $in: demoCodes } });
    console.timeEnd("CouponExisting");
    console.log(`Found ${existingDemo.length} existing demo coupons.`);
    
    console.log("Running Coupon expired query...");
    console.time("CouponExpired");
    const expiredDemoCoupons = await Coupon.find({
        code: { $in: demoCodes },
        end_date: { $lt: new Date() }
    });
    console.timeEnd("CouponExpired");
    console.log(`Found ${expiredDemoCoupons.length} expired demo coupons.`);
    
    await mongoose.connection.close();
    console.log("Done!");
}

test().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
