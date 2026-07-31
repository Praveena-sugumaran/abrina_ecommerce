const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const RFQ = require('../models/RFQ');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_clone');
        console.log('Connected to MongoDB');

        const userCount = await User.countDocuments();
        const productCount = await Product.countDocuments();
        const orderCount = await Order.countDocuments();
        const rfqCount = await RFQ.countDocuments();

        console.log(`Users: ${userCount}`);
        console.log(`Products: ${productCount}`);
        console.log(`Orders: ${orderCount}`);
        console.log(`RFQs: ${rfqCount}`);

        const suppliers = await User.find({ role: 'supplier' });
        console.log('\nSuppliers:');
        suppliers.forEach(s => {
            console.log(`- ${s.first_name} ${s.last_name} (${s.email}) ID: ${s._id}`);
        });

        if (suppliers.length > 0) {
            const jessy = suppliers.find(s => s.email === 'supplier@gmail.com');
            const targetId = jessy ? jessy._id : suppliers[0]._id;
            
            console.log(`\n--- JESSY DEBUG ---`);
            console.log(`Target ID: ${targetId}`);

            const products = await Product.find({ supplier: targetId });
            console.log(`Products for Jessy: ${products.length}`);
            if (products.length > 0) {
                console.log(`- Sample Product: ${products[0].name}, Status: ${products[0].status}`);
            }

            const orders = await Order.find({ supplier_id: targetId });
            console.log(`Orders for Jessy: ${orders.length}`);
            
            const rfqs = await RFQ.find({ status: 'active' });
            const myCatIds = [...new Set(products.map(p => p.category?.toString()).filter(Boolean))];
            const matchingRFQs = rfqs.filter(r => myCatIds.includes(r.category?.toString()));
            console.log(`Matching RFQs for Jessy: ${matchingRFQs.length}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
