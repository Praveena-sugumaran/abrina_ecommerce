const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const HeroSlide = require('../models/HeroSlide');
const SaleCampaign = require('../models/SaleCampaign');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');

const seedDummyBanners = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alibaba_demo';
        console.log('Connecting to MongoDB at:', uri);
        await mongoose.connect(uri);
        console.log('Connected to DB successfully!');

        // 1. Create or update the Sale Campaign
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

        console.log('Creating active Sale Campaign...');
        const campaign = await SaleCampaign.findOneAndUpdate(
            { title: "Mega Mid-Year Sale" },
            {
                title: "Mega Mid-Year Sale",
                subtitle: "48 hours left",
                startDate: yesterday,
                endDate: twoDaysLater,
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log('Active Campaign Seeded:', campaign.title, `(${campaign._id})`);

        // 2. Create or update the platform coupons
        console.log('Creating dummy Platform Coupons...');
        const couponsData = [
            {
                code: "PREMIA10",
                discount_type: "percentage",
                discount_value: 10,
                min_order_amount: 50,
                start_date: yesterday,
                end_date: twoDaysLater,
                is_active: true,
                supplier: null
            },
            {
                code: "PREMIA20",
                discount_type: "percentage",
                discount_value: 20,
                min_order_amount: 100,
                start_date: yesterday,
                end_date: twoDaysLater,
                is_active: true,
                supplier: null
            },
            {
                code: "PREMIASAVE",
                discount_type: "fixed",
                discount_value: 15,
                min_order_amount: 80,
                start_date: yesterday,
                end_date: twoDaysLater,
                is_active: true,
                supplier: null
            },
            {
                code: "FLASH50",
                discount_type: "percentage",
                discount_value: 50,
                min_order_amount: 200,
                start_date: yesterday,
                end_date: twoDaysLater,
                is_active: true,
                supplier: null
            },
            {
                code: "WELCOME5",
                discount_type: "fixed",
                discount_value: 5,
                min_order_amount: 20,
                start_date: yesterday,
                end_date: twoDaysLater,
                is_active: true,
                supplier: null
            }
        ];

        for (const coupon of couponsData) {
            await Coupon.findOneAndUpdate(
                { code: coupon.code },
                coupon,
                { upsert: true, new: true }
            );
        }
        console.log('Platform Coupons Seeded.');

        // Fetch products to link to slides
        console.log('Fetching products to link to slides...');
        const products = await Product.find().limit(3);
        const productIds = products.map(p => p._id);
        console.log(`Found ${productIds.length} products to link:`, productIds);

        // 3. Create or update Hero Slides
        console.log('Deactivating existing standard slides to highlight new dummy slides...');
        await HeroSlide.updateMany({}, { isActive: false });

        console.log('Seeding Standard Slide (Premia Beauty)...');
        const slide1 = await HeroSlide.findOneAndUpdate(
            { tag: "LIMITED TIME ONLY" },
            {
                tag: "LIMITED TIME ONLY",
                title: "EXPLORE PREMIA COLLECTIONS\nSAVE UP TO 70%",
                subtitle: "Premium products across beauty, fashion, home & more.",
                featuresText: "100% Authentic, Top Brands, Secure Payments, Easy Returns",
                cta1_label: "SHOP NOW",
                cta1_link: "/search?category=beauty",
                cta1_needsAuth: false,
                cta1_variant: "primary",
                cta2_label: "BROWSE MORE",
                cta2_link: "/search",
                cta2_variant: "outline",
                accent: "#722F37",
                gradFrom: "#4A0E17",
                gradMid: "#722F37",
                gradTo: "#8B0000",
                shape1: "#D4AF37",
                shape2: "#FFD700",
                statLabel: "70% OFF",
                isActive: true,
                order: 1,
                priority: 10,
                image: "uploads/premia_beauty_banner.png",
                mobileImage: "uploads/premia_beauty_banner.png",
                textAlignment: "left",
                discountText: "UP TO 70% OFF",
                campaignId: null,
                products: productIds
            },
            { upsert: true, new: true }
        );
        console.log('Standard Slide Seeded:', slide1.title);

        console.log('Seeding Campaign-Linked Slide (Flash Sale)...');
        const slide2 = await HeroSlide.findOneAndUpdate(
            { tag: "FLASH SALE" },
            {
                tag: "FLASH SALE",
                title: "Mega Mid-Year Sale Ends In:",
                subtitle: "Up to 80% Off Top Deals Across Brands",
                featuresText: "",
                cta1_label: "SHOP NOW",
                cta1_link: "/search",
                cta1_needsAuth: false,
                cta1_variant: "primary",
                cta2_label: "VIEW ALL DEALS",
                cta2_link: "/search",
                cta2_variant: "outline",
                accent: "#D4AF37",
                gradFrom: "#8B0000",
                gradMid: "#B22222",
                gradTo: "#DC143C",
                shape1: "#FFD700",
                shape2: "#FF8C00",
                statLabel: "FLASH SALE",
                isActive: true,
                order: 2,
                priority: 5,
                image: "uploads/premia_beauty_banner.png",
                mobileImage: "uploads/premia_beauty_banner.png",
                textAlignment: "center",
                discountText: "SAVE UP TO 80% OFF",
                campaignId: campaign._id
            },
            { upsert: true, new: true }
        );
        console.log('Campaign Slide Seeded:', slide2.title);

        console.log('Seeding Summer Fashion Slide...');
        const slide3 = await HeroSlide.findOneAndUpdate(
            { tag: "VIBRANT SUMMER FASHION" },
            {
                tag: "VIBRANT SUMMER FASHION",
                title: "TRENDING SUNNY APPARELS\nSAVE UP TO 60%",
                subtitle: "Upgrade your wardrobe with premium bags, hats, and summer footwear.",
                featuresText: "Premium Quality, Designer Labels, Safe Returns, Free Shipping",
                cta1_label: "EXPLORE SALE",
                cta1_link: "/search?category=fashion",
                cta1_needsAuth: false,
                cta1_variant: "primary",
                cta2_label: "SHOP CLOTHING",
                cta2_link: "/search",
                cta2_variant: "outline",
                accent: "#c2410c",
                gradFrom: "#7c2d12",
                gradMid: "#c2410c",
                gradTo: "#ea580c",
                shape1: "#fcd34d",
                shape2: "#fb923c",
                statLabel: "60% OFF",
                isActive: true,
                order: 3,
                priority: 8,
                image: "uploads/summer_fashion_banner_clean.png",
                mobileImage: "uploads/summer_fashion_banner_clean.png",
                textAlignment: "left",
                discountText: "SAVE UP TO 60% OFF",
                campaignId: null,
                textColor: "dark",
                products: productIds.slice(0, 2)
            },
            { upsert: true, new: true }
        );
        console.log('Summer Fashion Slide Seeded:', slide3.title);

        console.log('Seeding Next-Gen Gadgets Slide...');
        const slide4 = await HeroSlide.findOneAndUpdate(
            { tag: "NEXT-GEN ELECTRONICS" },
            {
                tag: "NEXT-GEN ELECTRONICS",
                title: "INTELLIGENT TECH GADGETS\nSAVE UP TO 50%",
                subtitle: "Discover smart speakers, high-end smartphones, and smart watches.",
                featuresText: "100% Original, Global Warranty, Secure Checkout, 24/7 Care",
                cta1_label: "SHOP GADGETS",
                cta1_link: "/search?category=electronics",
                cta1_needsAuth: false,
                cta1_variant: "primary",
                cta2_label: "VIEW GADGETS",
                cta2_link: "/search",
                cta2_variant: "outline",
                accent: "#1d4ed8",
                gradFrom: "#1e1b4b",
                gradMid: "#1e3a8a",
                gradTo: "#1d4ed8",
                shape1: "#a855f7",
                shape2: "#06b6d4",
                statLabel: "50% OFF",
                isActive: true,
                order: 4,
                priority: 7,
                image: "uploads/tech_gadgets_banner.png",
                mobileImage: "uploads/tech_gadgets_banner.png",
                textAlignment: "center",
                discountText: "UP TO 50% OFF",
                campaignId: null
            },
            { upsert: true, new: true }
        );
        console.log('Next-Gen Gadgets Slide Seeded:', slide4.title);

        console.log('✅ Seeding dummy banners completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding dummy banners:', error);
        process.exit(1);
    }
};

seedDummyBanners();
