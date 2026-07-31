const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

const distributeSections = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const products = await Product.find();

        // Let's assign some to Top Deals and Top Ranking
        for (let i = 0; i < products.length; i++) {
            let section = 'Just For You';
            if (i < 6) section = 'Top Deals';
            else if (i < 10) section = 'Top Ranking';
            else if (i < 14) section = 'New Arrivals';

            await Product.findByIdAndUpdate(products[i]._id, { section });
        }

        console.log('Distributed products into sections.');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

distributeSections();
