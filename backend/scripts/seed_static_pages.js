const mongoose = require('mongoose');
const Page = require('../models/Page');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const staticPages = [
    { title: 'For Buyers', slug: 'for-buyers', content: '<h1>For Buyers</h1><p>Learn how to source products efficiently on our platform.</p>' },
    { title: 'For Suppliers', slug: 'for-suppliers', content: '<h1>For Suppliers</h1><p>Expand your business globally with our supplier tools.</p>' },
    { title: 'Help & Support', slug: 'help-support', content: '<h1>Help & Support</h1><p>Find answers to frequently asked questions.</p>' },
    { title: 'Contact Us', slug: 'contact-us', content: '<h1>Contact Us</h1><p>Get in touch with our support team.</p>' },
    { title: 'Disputes & Reports', slug: 'disputes-reports', content: '<h1>Disputes & Reports</h1><p>Resolution center for trade disputes.</p>' },
    { title: 'Policies & Rules', slug: 'policies-rules', content: '<h1>Policies & Rules</h1><p>Our platform usage policies.</p>' },
    { title: 'Terms & Privacy', slug: 'terms-privacy', content: '<h1>Terms & Privacy</h1><p>Legal terms and data privacy policy.</p>' }
];

const seedPages = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alibaba_demo');
        console.log('Connected to DB...');

        for (const pageData of staticPages) {
            await Page.findOneAndUpdate(
                { slug: pageData.slug },
                pageData,
                { upsert: true, new: true }
            );
            console.log(`Seeded page: ${pageData.title}`);
        }

        console.log('✅ All static pages seeded successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding pages:', err);
        process.exit(1);
    }
};

seedPages();
