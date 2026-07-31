const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Category = require('../models/Category');

const data = [
    {
        title: "Electronics & Accessories",
        slug: "electronics",
        image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=400&fit=crop",
        subcategories: [
            { title: "Smartphones & Accessories", slug: "smartphones-accessories", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop" },
            { title: "Laptops & Computers", slug: "laptops-computers", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=300&fit=crop" },
            { title: "Audio & Headphones", slug: "audio-headphones", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop" },
            { title: "Cameras & Photography", slug: "cameras-photography", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&h=300&fit=crop" },
            { title: "Smart Wearables", slug: "smart-wearables", image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=300&h=300&fit=crop" },
            { title: "TV & Home Entertainment", slug: "tv-home-entertainment", image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=300&h=300&fit=crop" },
            { title: "Gaming & Consoles", slug: "gaming-consoles", image: "https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=300&h=300&fit=crop" },
            { title: "Storage & Accessories", slug: "storage-accessories", image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=300&h=300&fit=crop" },
            { title: "Networking Devices", slug: "networking-devices", image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&h=300&fit=crop" },
            { title: "Office Electronics", slug: "office-electronics", image: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=300&h=300&fit=crop" }
        ]
    },
    {
        title: "Fashion & Apparel",
        slug: "fashion",
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop",
        subcategories: [
            { title: "Men's Clothing", slug: "mens-clothing", image: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=300&h=300&fit=crop" },
            { title: "Women's Clothing", slug: "womens-clothing", image: "https://images.unsplash.com/photo-1509319117193-57bab727e09d?w=300&h=300&fit=crop" },
            { title: "Shoes", slug: "shoes", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop" },
            { title: "Bags", slug: "bags", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=300&fit=crop" }
        ]
    },
    {
        title: "Home & Living",
        slug: "home-living",
        image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&h=400&fit=crop",
        subcategories: [
            { title: "Modern Furniture", slug: "modern-furniture", image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=300&h=300&fit=crop" },
            { title: "Kitchenware & Cookware", slug: "kitchenware-cookware", image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=300&h=300&fit=crop" },
            { title: "Lighting", slug: "lighting", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&h=300&fit=crop" },
            { title: "Home Decor", slug: "home-decor", image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&h=300&fit=crop" }
        ]
    },
    {
        title: "Beauty & Personal Care",
        slug: "beauty",
        image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",
        subcategories: [
            { title: "Skin Care & Serums", slug: "skin-care-serums", image: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=300&h=300&fit=crop" },
            { title: "Cosmetics & Makeup", slug: "cosmetics-makeup", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=300&fit=crop" },
            { title: "Hair Care", slug: "hair-care", image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=300&h=300&fit=crop" }
        ]
    },
    {
        title: "Sports & Outdoors",
        slug: "sports",
        image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop",
        subcategories: [
            { title: "Fitness & Gym Equipment", slug: "fitness-gym-equipment", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&h=300&fit=crop" },
            { title: "Outdoor & Camping Gear", slug: "outdoor-camping-gear", image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=300&h=300&fit=crop" }
        ]
    },
    {
        title: "Automotive & Parts",
        slug: "automotive",
        image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400&h=400&fit=crop",
        subcategories: [
            { title: "Wheels & Brake Systems", slug: "wheels-brake-systems", image: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=300&h=300&fit=crop" },
            { title: "Auto Electronics", slug: "auto-electronics", image: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=300&h=300&fit=crop" }
        ]
    },
    {
        title: "Toys, Kids & Baby",
        slug: "toys",
        image: "https://images.unsplash.com/photo-1537655780520-1e392edd816a?w=400&h=400&fit=crop",
        subcategories: [
            { title: "Baby Care", slug: "baby-care", image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300&h=300&fit=crop" },
            { title: "Educational Toys", slug: "educational-toys", image: "https://images.unsplash.com/photo-1515488042361-404e9250afef?w=300&h=300&fit=crop" }
        ]
    },
    {
        title: "Health & Wellness",
        slug: "health",
        image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=400&fit=crop",
        subcategories: [
            { title: "Medical Devices & Equipment", slug: "medical-devices-equipment", image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=300&h=300&fit=crop" },
            { title: "Supplements & Wellness", slug: "supplements-wellness", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&h=300&fit=crop" }
        ]
    },
    {
        title: "Books & Stationery",
        slug: "books",
        image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=400&fit=crop",
        subcategories: [
            { title: "Office Stationery", slug: "office-stationery", image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&h=300&fit=crop" },
            { title: "Notebooks & Journals", slug: "notebooks-journals", image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=300&h=300&fit=crop" }
        ]
    },
    {
        title: "Pet Supplies",
        slug: "pet-supplies",
        image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=400&h=400&fit=crop",
        subcategories: [
            { title: "Dog Supplies", slug: "dog-supplies", image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&h=300&fit=crop" },
            { title: "Cat Supplies", slug: "cat-supplies", image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop" }
        ]
    },
    {
        title: "Tools & Home Improvement",
        slug: "tools",
        image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=400&fit=crop",
        subcategories: [
            { title: "Power Tools & Drills", slug: "power-tools-drills", image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&h=300&fit=crop" },
            { title: "Hand Tool Sets", slug: "hand-tool-sets", image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&h=300&fit=crop" }
        ]
    }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        for (const item of data) {
            let parentCat = await Category.findOne({
                $or: [{ slug: item.slug }, { title: item.title }]
            });

            if (!parentCat) {
                parentCat = new Category({
                    title: item.title,
                    slug: item.slug,
                    image: item.image,
                    level: 0,
                    status: 'active'
                });
                await parentCat.save();
                console.log(`Created parent category: ${parentCat.title}`);
            } else {
                parentCat.image = item.image;
                parentCat.title = item.title;
                parentCat.slug = item.slug;
                await parentCat.save();
                console.log(`Updated parent category: ${parentCat.title}`);
            }

            for (const sub of item.subcategories) {
                let subCat = await Category.findOne({
                    $or: [{ slug: sub.slug }, { title: sub.title }]
                });

                if (!subCat) {
                    subCat = new Category({
                        title: sub.title,
                        slug: sub.slug,
                        image: sub.image,
                        parent: parentCat._id,
                        level: 1,
                        status: 'active'
                    });
                    await subCat.save();
                    console.log(`Created subcategory: ${subCat.title}`);
                } else {
                    subCat.image = sub.image;
                    subCat.title = sub.title;
                    subCat.slug = sub.slug;
                    subCat.parent = parentCat._id;
                    subCat.level = 1;
                    await subCat.save();
                    console.log(`Updated subcategory: ${subCat.title}`);
                }
            }
        }

        console.log('Seeding finished successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seed();
