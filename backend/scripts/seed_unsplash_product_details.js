/**
 * Script to backfill Product fields: rating, numOrders, oldPrice, and 5 Unsplash images.
 * Run with: node scripts/seed_unsplash_product_details.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const unsplashShoes = [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop", // Nike Red
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop", // Sneaker colourful
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&auto=format&fit=crop", // Leather dress shoes
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&auto=format&fit=crop", // Vans yellow
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&auto=format&fit=crop", // Running black shoe
    "https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&auto=format&fit=crop", // Dr Martens boots
    "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800&auto=format&fit=crop"  // Converse red
];

const unsplashApparel = [
    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop", // Shirts flat lay
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop", // Hoodie gray
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop", // Black t-shirt
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop", // Denim jacket
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop"  // Female yellow dress
];

const unsplashTech = [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop", // White smartwatch
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop", // Headphones black
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop", // Smartwatch black
    "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800&auto=format&fit=crop"  // Earbuds wireless
];

const unsplashAccessories = [
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop", // Orange handbag
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop", // Sunglasses red
    "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop", // Leather watch
    "https://images.unsplash.com/photo-1627124765135-56a234230018?w=800&auto=format&fit=crop"  // Wallet brown
];

const allPool = [...unsplashShoes, ...unsplashApparel, ...unsplashTech, ...unsplashAccessories];

const getUnsplashImages = (name) => {
    const text = name.toLowerCase();
    let categoryPool = [];

    if (text.includes('shoe') || text.includes('sneaker') || text.includes('boots') || text.includes('footwear')) {
        categoryPool = unsplashShoes;
    } else if (text.includes('shirt') || text.includes('hoodie') || text.includes('apparel') || text.includes('wear') || text.includes('yoga') || text.includes('dress') || text.includes('garment')) {
        categoryPool = unsplashApparel;
    } else if (text.includes('watch') || text.includes('headphone') || text.includes('earbud') || text.includes('tech') || text.includes('device') || text.includes('smart')) {
        categoryPool = unsplashTech;
    } else if (text.includes('bag') || text.includes('wallet') || text.includes('sunglasses') || text.includes('glasses') || text.includes('accessory')) {
        categoryPool = unsplashAccessories;
    }

    // Combine pool with all remaining images to ensure we always have at least 5
    const pool = [...categoryPool, ...allPool.filter(img => !categoryPool.includes(img))];
    
    // Select unique 5 images
    const selected = [];
    for (let i = 0; i < pool.length && selected.length < 5; i++) {
        if (!selected.includes(pool[i])) {
            selected.push(pool[i]);
        }
    }
    return selected;
};

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const products = await Product.find({});
    console.log(`Found ${products.length} products. Backfilling detail page retail values...`);

    let updated = 0;
    for (const product of products) {
        // Get valid price
        const price = Number(product.price) || Number(product.main_price) || 29.99;

        // 1. Dynamic Unsplash Images (5 distinct images)
        const images = getUnsplashImages(product.name);
        const main_image = images[0];

        // 2. Realistic Rating (4.0 - 4.9 stars)
        const rating = parseFloat((4.0 + (product._id.toString().charCodeAt(product._id.toString().length - 1) % 10) * 0.1).toFixed(1));

        // 3. Realistic Sold Count (100 - 1500 sold)
        const numOrders = Math.floor(100 + (product._id.toString().charCodeAt(product._id.toString().length - 2) % 9) * 150);

        // 4. Strikethrough oldPrice (Original Price) - e.g. 40% higher
        const oldPrice = parseFloat((price * 1.4).toFixed(2));

        await Product.updateOne(
            { _id: product._id },
            { 
                $set: { 
                    images, 
                    main_image, 
                    rating, 
                    numOrders, 
                    oldPrice,
                    price // ensure price is cast to valid number as well
                } 
            }
        );
        console.log(`  ✓ Updated: "${product.name}" | Price: ${price} | Old: ${oldPrice} | Rating: ${rating} | Sold: ${numOrders}`);
        updated++;
    }

    console.log(`\n✅ Done! Successfully updated ${updated} products in database.`);
    await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
