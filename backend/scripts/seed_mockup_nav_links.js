const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const HeaderNavigation = require('../models/HeaderNavigation');

const seedMockupNavLinks = async () => {
    try {
        const uri = process.env.MONGO_URI;
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected to DB successfully!');

        console.log('Clearing existing header navigation links...');
        await HeaderNavigation.deleteMany({});

        const newLinks = [
            {
                title: "Dollar Express",
                url: "/section/dollar-express",
                order: 1,
                isFlash: false,
                status: "active",
                parent: null
            },
            {
                title: "Welcome Deal",
                url: "/section/welcome-deal",
                order: 2,
                isFlash: false,
                status: "active",
                parent: null
            },
            {
                title: "Local Shipping",
                url: "/section/local-shipping",
                order: 3,
                isFlash: false,
                status: "active",
                parent: null
            },
            {
                title: "Super Deals",
                url: "/section/super-deals",
                order: 4,
                isFlash: true,
                status: "active",
                parent: null
            },
            {
                title: "AliExpress Business",
                url: "/become-supplier",
                order: 5,
                isFlash: false,
                status: "active",
                parent: null
            }
        ];

        console.log('Seeding mockup navigation links...');
        await HeaderNavigation.insertMany(newLinks);
        console.log('✅ Mockup navigation links seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding mockup navigation links:', error);
        process.exit(1);
    }
};

seedMockupNavLinks();
