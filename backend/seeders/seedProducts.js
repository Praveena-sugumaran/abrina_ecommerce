const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Category = require('./models/Category');
const User = require('./models/User');
const Language = require('./models/Language');
const Currency = require('./models/Currency');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected to seed data...');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        await connectDB();

        // 1. Clear existing data
        await Category.deleteMany({});
        await Product.deleteMany({});
        await Language.deleteMany({});
        await Currency.deleteMany({});

        // Find or create a demo supplier
        let supplier = await User.findOne({ role: 'supplier' });
        if (!supplier) {
            supplier = await User.create({
                first_name: 'Demo',
                last_name: 'Supplier',
                email: 'supplier@demo.com',
                password: 'password123',
                role: 'supplier',
                company_name: 'Alibaba Global Trading',
                is_verified: true,
                business_type: ['export'],
                country_code: 'CN',
                status: 'active'
            });
        }

        // 2. Hierarchical Categories with Premium Images
        const electronics = await Category.create({
            title: 'Electronics',
            level: 0,
            image: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop'
        });
        const mobilePhones = await Category.create({ title: 'Mobile Phones', parent: electronics._id, level: 1 });
        const androidPhones = await Category.create({ title: 'Android Phones', parent: mobilePhones._id, level: 2 });
        const accessories = await Category.create({ title: 'Accessories', parent: electronics._id, level: 1 });
        const chargers = await Category.create({ title: 'Chargers', parent: accessories._id, level: 2 });

        const homeGarden = await Category.create({
            title: 'Home & Garden',
            level: 0,
            image: 'https://images.unsplash.com/photo-1585128719715-46776b56a0d1?w=800&auto=format&fit=crop'
        });
        const furniture = await Category.create({ title: 'Furniture', parent: homeGarden._id, level: 1 });
        const officeFurniture = await Category.create({ title: 'Office Furniture', parent: furniture._id, level: 2 });

        const apparel = await Category.create({
            title: 'Apparel & Fashion',
            level: 0,
            image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&auto=format&fit=crop'
        });

        const sports = await Category.create({
            title: 'Sports & Entertainment',
            level: 0,
            image: 'https://images.unsplash.com/photo-1461896704190-32135b33ee88?w=800&auto=format&fit=crop'
        });

        const beauty = await Category.create({
            title: 'Beauty & Personal Care',
            level: 0,
            image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop'
        });

        const industrial = await Category.create({
            title: 'Industrial Machinery',
            level: 0,
            image: 'https://images.unsplash.com/photo-1504917595217-d4dc5f6497d7?w=800&auto=format&fit=crop'
        });

        console.log('Categories created.');

        // Seed Languages
        await Language.create([
            { name: 'English', code: 'en', native_name: 'English' },
            { name: 'Hindi', code: 'hi', native_name: 'हिन्दी' },
            { name: 'Tamil', code: 'ta', native_name: 'தமிழ்' },
            { name: 'Chinese', code: 'zh', native_name: '中文' }
        ]);
        console.log('Languages seeded.');

        // Seed Currencies
        await Currency.create([
            { name: 'US Dollar', code: 'USD', symbol: '$', exchange_rate: 1 },
            { name: 'Indian Rupee', code: 'INR', symbol: '₹', exchange_rate: 83.5 },
            { name: 'Euro', code: 'EUR', symbol: '€', exchange_rate: 0.92 },
            { name: 'British Pound', code: 'GBP', symbol: '£', exchange_rate: 0.78 }
        ]);
        console.log('Currencies seeded.');

        // 3. Products with Tier Pricing
        const products = [
            {
                name: 'EliteBook Pro 14" - Powerful Performance Laptop',
                supplier: supplier._id,
                category: electronics._id,
                description: 'Latest generation i7 processor, 16GB RAM, 512GB SSD. Crystal clear display.',
                sku: 'EB-PRO-14',
                moq: 1,
                currency: 'USD',
                price_tiers: [
                    { min_quantity: 1, max_quantity: 5, price: 999 },
                    { min_quantity: 6, max_quantity: 20, price: 949 },
                    { min_quantity: 21, max_quantity: null, price: 899 }
                ],
                main_image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop',
                images: [
                    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop'
                ],
                rating: 4.8,
                numReviews: 1250,
                status: 'active',
                isFeatured: true,
                section: 'Top Deals',
                oldPrice: 1200
            },
            {
                name: 'Modern Nordic Fabric Sofa - 3 Seater',
                supplier: supplier._id,
                category: furniture._id,
                description: 'Comfortable minimalist design sofa with premium fabric upholstery.',
                sku: 'FUR-SF-102',
                moq: 2,
                currency: 'USD',
                price_tiers: [
                    { min_quantity: 2, max_quantity: 10, price: 450 },
                    { min_quantity: 11, max_quantity: null, price: 399 }
                ],
                main_image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop',
                images: [
                    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&auto=format&fit=crop'
                ],
                rating: 4.6,
                numReviews: 860,
                status: 'active',
                isFeatured: true,
                section: 'Top Ranking',
                oldPrice: 600
            },
            {
                name: 'Smart Watch Series 7 - Fitness & Health Tracker',
                supplier: supplier._id,
                category: androidPhones._id,
                description: 'Monitors heart rate, blood oxygen, and sleep. Waterproof with GPS.',
                sku: 'SW-S7-2023',
                moq: 10,
                currency: 'USD',
                price_tiers: [
                    { min_quantity: 10, max_quantity: 100, price: 35 },
                    { min_quantity: 101, max_quantity: null, price: 28 }
                ],
                main_image: 'https://images.unsplash.com/photo-1544117518-30dd057209fc?w=800&auto=format&fit=crop',
                images: [
                    'https://images.unsplash.com/photo-1544117518-30dd057209fc?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop'
                ],
                rating: 4.7,
                numReviews: 2100,
                status: 'active',
                isFeatured: true,
                section: 'New Arrivals',
                oldPrice: 50
            }
        ];

        // Add 18 varied products for "Just For You"
        const justForYouTemplates = [
            {
                name: 'Wireless Bluetooth Headset',
                images: [
                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop'
                ]
            },
            {
                name: 'Mechanical Gaming Keyboard',
                images: [
                    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&auto=format&fit=crop'
                ]
            },
            {
                name: 'Portable SSD 1TB USB-C',
                images: [
                    'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1601524909162-be87252be298?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop'
                ]
            },
            {
                name: '4K Action Camera Waterproof',
                images: [
                    'https://images.unsplash.com/photo-1526170315870-ef6d82f58396?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=800&auto=format&fit=crop'
                ]
            },
            {
                name: 'Minimalist Wall Clock',
                images: [
                    'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1532635241-17e820acf59f?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&auto=format&fit=crop'
                ]
            },
            {
                name: 'Leather Messenger Bag',
                images: [
                    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1590874103328-eacb5e699ce7?w=800&auto=format&fit=crop'
                ]
            }
        ];

        for (let i = 0; i < 18; i++) {
            const template = justForYouTemplates[i % justForYouTemplates.length];
            products.push({
                name: `${template.name} - Batch ${Math.floor(i / 6) + 1}`,
                supplier: supplier._id,
                category: electronics._id,
                description: 'High performance product sourced globally.',
                sku: `JFY-PROD-${i}`,
                moq: Math.floor(Math.random() * 20) + 1,
                currency: 'USD',
                price_tiers: [
                    { min_quantity: 1, max_quantity: 10, price: Math.floor(Math.random() * 50) + 20 },
                    { min_quantity: 11, max_quantity: null, price: Math.floor(Math.random() * 40) + 15 }
                ],
                main_image: template.images[0],
                images: template.images,
                rating: 4.0 + Math.random(),
                numReviews: Math.floor(Math.random() * 500) + 50,
                status: 'active',
                section: 'Just For You'
            });
        }

        for (const p of products) {
            const prod = new Product(p);
            await prod.save();
        }

        console.log('Products seeded successfully.');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedData();
