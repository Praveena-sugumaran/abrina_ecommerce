const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');

dotenv.config();

const categories = [
    { title: 'Consumer Electronics', subtitle: 'Latest Gadgets', description: 'Smartphones, laptops, and more.', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&h=300&fit=crop' },
    { title: 'Home & Garden', subtitle: 'Smart Home', description: 'Decor and smart devices.', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&h=300&fit=crop' },
    { title: 'Sports & Entertainment', subtitle: 'Outdoor Fun', description: 'Gear for your activities.', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&h=300&fit=crop' },
    { title: 'Jewelry & Watches', subtitle: 'Elegant Style', description: 'Finest accessories.', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop' }
];

const products = [
    // Top Deals Section (6 items)
    { brand: 'VALDUS', name: 'AMOLED Smartwatch Ultra', price: 1662.4, oldPrice: 1847.1, description: 'Score the lowest prices.', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', section: 'Top Deals', moq: 1, isFeatured: true },
    { brand: 'CHRONO', name: 'Military Sports Watch v2', price: 1624.3, oldPrice: 2100.0, description: 'Durable and stylish.', image: 'https://images.unsplash.com/photo-1508685096489-7aac29a27f6f?w=400&h=400&fit=crop', section: 'Top Deals', moq: 1, isFeatured: true },
    { brand: 'TECH', name: 'Elite GPS Navigator Pro', price: 3703.5, oldPrice: 4500.0, description: 'Never get lost.', image: 'https://images.unsplash.com/photo-1544117518-e7963214598c?w=400&h=400&fit=crop', section: 'Top Deals', moq: 1, isFeatured: true },
    { brand: 'ZENITH', name: 'Titanium Air Pro 2', price: 1669.8, oldPrice: 1999.0, description: 'Premium audio.', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', section: 'Top Deals', moq: 1, isFeatured: true },
    { brand: 'SONO', name: 'Real GPS Smartwatch X', price: 2032.7, oldPrice: 2500.0, description: 'Advanced tracking.', image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop', section: 'Top Deals', moq: 1, isFeatured: true },
    { brand: 'VITRO', name: 'Fashion Pro Smart Z', price: 2495.9, oldPrice: 4991.8, description: 'Style meets tech.', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop', section: 'Top Deals', moq: 1, isFeatured: true },

    // Top Ranking Section (4 items)
    { brand: 'LEICA', name: 'Heritage X-10 Camera', price: 2400.0, description: 'Top rated trends.', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop', section: 'Top Ranking', moq: 1, isFeatured: true },
    { brand: 'AIS', name: 'Translation Glasses', price: 1200.0, description: 'Smart translator.', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop', section: 'Top Ranking', moq: 1, isFeatured: true },
    { brand: 'DELL', name: 'XPS Infinity', price: 1800.0, description: 'Professional laptop.', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop', section: 'Top Ranking', moq: 1, isFeatured: true },
    { brand: 'BOSE', name: 'Quiet Comfort Plus', price: 349.0, description: 'Noise cancelling.', image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop', section: 'Top Ranking', moq: 1, isFeatured: true },

    // New Arrivals Section (4 items)
    { brand: 'GEN', name: 'Smart Health v3', price: 89.0, description: 'Latest health tech.', image: 'https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=400&h=400&fit=crop', section: 'New Arrivals', moq: 1, isFeatured: true },
    { brand: 'ORBI', name: 'Mesh WiFi 7 Elite', price: 599.0, description: 'Ultimate speed.', image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=400&fit=crop', section: 'New Arrivals', moq: 1, isFeatured: true },
    { brand: 'DYSON', name: 'Air Purifier Max', price: 449.0, description: 'Pure home air.', image: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&h=400&fit=crop', section: 'New Arrivals', moq: 1, isFeatured: true },
    { brand: 'TESLA', name: 'Wall Connector v3', price: 475.0, description: 'EV fast charging.', image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&h=400&fit=crop', section: 'New Arrivals', moq: 1, isFeatured: true }
];

// Add 30 more random products for infinite scroll
for (let i = 1; i <= 30; i++) {
    products.push({
        brand: 'VENDOR-' + i,
        name: `Wholesale Luxury Product ${i} - High Quality`,
        price: Math.floor(Math.random() * 5000) + 100,
        description: 'Quality wholesale product for business.',
        image: `https://images.unsplash.com/photo-${1500000000000 + i * 1000}?w=400&h=400&fit=crop`,
        section: 'None',
        moq: Math.floor(Math.random() * 50) + 1,
        isFeatured: false
    });
}

const importData = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        await Category.deleteMany();
        await Product.deleteMany();

        // Remove old test supplier
        await User.deleteMany({ email: 'test_supplier@demo.com' });

        const dummySupplier = await User.create({
            first_name: 'Test',
            last_name: 'Supplier',
            email: 'test_supplier@demo.com',
            password: 'seederpassword123',
            role: 'supplier',
            business_info: { company_name: 'Alibaba Seeder Inc' }
        });

        const createdCategories = [];
        for (const cat of categories) {
            const created = await Category.create(cat);
            createdCategories.push(created);
        }

        const sampleProducts = products.map((p, index) => {
            const { price, image, oldPrice, ...rest } = p;
            return {
                ...rest,
                supplier: dummySupplier._id,
                category: createdCategories[index % createdCategories.length]._id,
                price_tiers: [{ min_quantity: 1, price: price }],
                images: [image]
            };
        });

        for (const prod of sampleProducts) {
            await Product.create(prod);
        }

        console.log('Data Imported with ' + products.length + ' products!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

importData();
