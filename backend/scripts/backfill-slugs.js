/**
 * One-time script to backfill slug field for all products that don't have one.
 * Run with: node scripts/backfill-slugs.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const generateSlug = (name) =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const products = await Product.find({});
    console.log(`Found ${products.length} products. Processing...`);

    let updated = 0;
    for (const product of products) {
        const newSlug = generateSlug(product.name);
        if (!product.slug || product.slug !== newSlug) {
            // Check for slug collision and append ID suffix if needed
            let slug = newSlug;
            const existing = await Product.findOne({ slug, _id: { $ne: product._id } });
            if (existing) {
                slug = `${newSlug}-${product._id.toString().slice(-6)}`;
            }
            await Product.updateOne({ _id: product._id }, { $set: { slug } });
            console.log(`  ✓ ${product.name} → ${slug}`);
            updated++;
        }
    }

    console.log(`\n✅ Done! Updated ${updated} products.`);
    await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
