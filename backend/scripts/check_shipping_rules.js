const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ShippingRule = require('../models/ShippingRule');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const rules = await ShippingRule.find({});
        console.log("SHIPPING_RULES:", JSON.stringify(rules, null, 2));
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

run();
