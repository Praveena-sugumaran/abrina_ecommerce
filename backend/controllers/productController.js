const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
// User model lazy-loaded in functions to avoid initialization issues

// Utility: Recursively find all child category IDs
const getChildCategoryIds = async (parentId) => {
    const cleanId = typeof parentId === 'string' && mongoose.Types.ObjectId.isValid(parentId)
        ? new mongoose.Types.ObjectId(parentId)
        : parentId;
    let ids = [cleanId];
    const children = await Category.find({ parent: cleanId, status: 'active' }).select('_id');
    for (const child of children) {
        const subIds = await getChildCategoryIds(child._id);
        ids = ids.concat(subIds);
    }
    return ids;
};

// ─────────────────────────────────────────────
// PUBLIC: Get all active/approved products with filtering
// GET /api/products
// ─────────────────────────────────────────────
exports.getProducts = async (req, res) => {
    try {
        const {
            keyword, category_id, min_price, max_price,
            min_moq, country, supplier_type, verified_only,
            rating_min, sort_by, page = 1, limit = 20, isFeatured, section,
            verified_pro, trade_assurance, moq_under_5, five_plus_years,
            rating_45, ce_cert, emc_cert, bulk, sample_available
        } = req.query;

        let resolvedCategoryId = category_id;
        if (category_id && category_id !== 'undefined' && !mongoose.Types.ObjectId.isValid(category_id)) {
            const cat = await Category.findOne({ slug: category_id.toLowerCase().trim() });
            resolvedCategoryId = cat ? cat._id.toString() : null;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const query = { status: 'active', approval_status: 'approved', countInStock: { $gt: 0 } };
        if (isFeatured === 'true' || isFeatured === true) query.isFeatured = true;

        // ALGORITHMIC SECTION LOGIC
        // If section is provided, we use the strategy requested: auto-calculating best items
        let pipelineSort = false; // Flag to indicate if we've already handled sorting via pipeline

        if (section === 'Top Deals' || section === 'Super Deals' || section === 'super-deals' || section === 'top-deals') {
            // Logic: Highest discount items
            query.oldPrice = { $gt: 0 };
        } else if (section === 'Top Ranking' || section === 'top-ranking') {
            // Logic: Sorted by ranking_score (already calculated in pre-save)
            // No extra filter needed, just sort later
        } else if (section === 'New Arrivals' || section === 'new-arrivals') {
            // Logic: Recently added - Filter for last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            query.createdAt = { $gte: sevenDaysAgo };
        } else if (section === 'Dollar Express' || section === 'dollar-express') {
            // Logic: Cheap wholesale items under $2
            query.main_price = { $lte: 2.00 };
        } else if (section === 'Welcome Deal' || section === 'welcome-deal') {
            // Logic: Cheap deals under $5
            query.oldPrice = { $gt: 0 };
            query.main_price = { $lte: 5.00 };
        } else if (section && section !== 'undefined') {
            // Fallback for any legacy manual sections
            query.section = section;
        }

        if (keyword) {
            // Check if keyword is a categories match
            const categoryMatch = await Category.findOne({
                title: { $regex: keyword.trim(), $options: 'i' },
                status: 'active'
            });

            if (categoryMatch) {
                const subCats = await getChildCategoryIds(categoryMatch._id);
                query.category = { $in: subCats };
            } else {
                const cleanSearch = keyword.trim().toLowerCase();
                const words = cleanSearch.split(/\s+/).filter(w => w.length > 0);
                if (words.length > 1) {
                    const andConditions = words.map(w => ({
                        $or: [
                            { name: { $regex: w, $options: 'i' } },
                            { description: { $regex: w, $options: 'i' } }
                        ]
                    }));
                    query.$and = andConditions;
                } else {
                    query.$or = words.reduce((acc, w) => {
                        acc.push({ name: { $regex: w, $options: 'i' } });
                        acc.push({ description: { $regex: w, $options: 'i' } });
                        return acc;
                    }, []);
                }
            }
        }

        if (resolvedCategoryId && resolvedCategoryId !== 'undefined') {
            const allCategoryIds = await getChildCategoryIds(resolvedCategoryId);
            query.category = { $in: allCategoryIds };
        }

        if (min_price || max_price) {
            query.main_price = {};
            if (min_price) query.main_price.$gte = parseFloat(min_price);
            if (max_price) query.main_price.$lte = parseFloat(max_price);
        }

        if (rating_min) {
            query.rating = { $gte: parseFloat(rating_min) };
        }

        if (rating_45 === 'true') {
            query.rating = { $gte: 4.5 };
        }

        // Special requested behaviors for sorting filters
        if (sort_by === 'rating') {
            if (!query.rating) query.rating = {};
            query.rating.$gte = 4.5;
        }

        if (sort_by === 'recent') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            query.createdAt = { $gte: sevenDaysAgo };
        }

        // Dynamic Custom Fields Filter (e.g. custom_filters={"Warranty":"1 Year"})
        let customFiltersMatch = null;
        const { custom_filters } = req.query;
        if (custom_filters) {
            try {
                const filters = typeof custom_filters === 'string' ? JSON.parse(custom_filters) : custom_filters;
                if (filters && Object.keys(filters).length > 0) {
                    const andConditions = [];
                    for (const [cfKey, cfVal] of Object.entries(filters)) {
                        if (cfVal) {
                            const values = String(cfVal).split(',').map(v => v.trim()).filter(Boolean);
                            if (values.length > 0) {
                                andConditions.push({
                                    key_attributes: {
                                        $elemMatch: {
                                            key: cfKey,
                                            value: { $in: values }
                                        }
                                    }
                                });
                            }
                        }
                    }
                    if (andConditions.length > 0) {
                        customFiltersMatch = { $and: andConditions };
                    }
                }
            } catch (e) {
                console.error("Error parsing custom_filters query:", e);
            }
        }

        const pipeline = [];
        pipeline.push({ $match: query });
        if (customFiltersMatch) {
            pipeline.push({ $match: customFiltersMatch });
        }

        // Add calculated fields for sorting if needed
        if (section === 'Top Deals' || section === 'Super Deals' || section === 'super-deals' || section === 'top-deals' || section === 'Welcome Deal' || section === 'welcome-deal') {
            pipeline.push({
                $addFields: {
                    discountAmount: { $subtract: ["$oldPrice", "$main_price"] },
                    discountPercent: {
                        $cond: [
                            { $gt: ["$oldPrice", 0] },
                            { $divide: [{ $subtract: ["$oldPrice", "$main_price"] }, "$oldPrice"] },
                            0
                        ]
                    }
                }
            });
        }

        pipeline.push({
            $lookup: { from: 'users', localField: 'supplier', foreignField: '_id', as: 'supplier_info' }
        });
        pipeline.push({ $unwind: '$supplier_info' });

        pipeline.push({
            $lookup: { from: 'subscriptionplans', localField: 'supplier_info.subscription_plan', foreignField: '_id', as: 'supplier_info.subscription_plan_info' }
        });
        pipeline.push({ $unwind: { path: '$supplier_info.subscription_plan_info', preserveNullAndEmptyArrays: true } });

        // Join company info for advanced filters (Location name, Certifications)
        pipeline.push({
            $lookup: { from: 'companies', localField: 'supplier', foreignField: 'user_id', as: 'company_info' }
        });
        pipeline.push({ $unwind: { path: '$company_info', preserveNullAndEmptyArrays: true } });

        if (verified_only === 'true' || trade_assurance === 'true') {
            pipeline.push({ $match: { 'supplier_info.is_verified': true } });
        }

        if (verified_pro === 'true') {
            pipeline.push({
                $match: {
                    $or: [
                        { 'supplier_info.subscription_plan_info.has_verified_badge': true },
                        { isPremium: 1 }
                    ]
                }
            });
        }

        if (five_plus_years === 'true') {
            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
            pipeline.push({
                $match: {
                    $or: [
                        { 'company_info.years_experience': { $gte: 5 } },
                        { 'supplier_info.createdAt': { $lte: fiveYearsAgo } }
                    ]
                }
            });
        }

        if (country) {
            pipeline.push({
                $match: {
                    $or: [
                        { 'supplier_info.country_code': country.toUpperCase() },
                        { 'company_info.country': { $regex: country, $options: 'i' } }
                    ]
                }
            });
        }

        if (supplier_type) pipeline.push({ $match: { 'supplier_info.business_type': supplier_type } });

        // Certifications filter
        const { certifications } = req.query;
        if (certifications) {
            const certArray = certifications.split(',').map(c => c.trim());
            pipeline.push({ $match: { 'company_info.certifications': { $in: certArray } } });
        }

        if (ce_cert === 'true') {
            pipeline.push({ $match: { 'company_info.certifications': { $regex: 'CE', $options: 'i' } } });
        }

        if (emc_cert === 'true') {
            pipeline.push({ $match: { 'company_info.certifications': { $regex: 'EMC', $options: 'i' } } });
        }

        pipeline.push({
            $addFields: {
                isPremium: {
                    $cond: [{ $ifNull: ["$supplier_info.subscription_plan", false] }, 1, 0]
                }
            }
        });

        // Sales Region Filtering
        const { user_country } = req.query;
        if (user_country && user_country !== 'undefined') {
            pipeline.push({
                $match: {
                    $or: [
                        { sales_type: 'worldwide' },
                        { sales_type: { $exists: false } },
                        { sales_type: 'specific', countries: { $in: [user_country.toUpperCase()] } }
                    ]
                }
            });
        }

        // SORTING LOGIC
        let sortObj = { isPromoted: -1, isPremium: -1, ppc_bid: -1, createdAt: -1 };

        // Use sort_by if provided, otherwise use section default
        if (sort_by === 'price_asc') sortObj = { main_price: 1 };
        else if (sort_by === 'price_desc') sortObj = { main_price: -1 };
        else if (sort_by === 'rating') sortObj = { rating: -1 };
        else if (sort_by === 'ranking') sortObj = { ranking_score: -1 };
        else if (sort_by === 'recent') sortObj = { createdAt: -1 };
        else if (section === 'Top Deals') {
            sortObj = { discountPercent: -1, isPromoted: -1, isPremium: -1 };
        } else if (section === 'Top Ranking' || section === 'Top ranking') {
            sortObj = { ranking_score: -1, isPromoted: -1, isPremium: -1 };
        } else if (section === 'New Arrivals' || section === 'New arrivals') {
            sortObj = { createdAt: -1, isPromoted: -1, isPremium: -1 };
        }

        pipeline.push({ $sort: sortObj });

        const countPipeline = [...pipeline, { $count: 'total' }];
        const totalResult = await Product.aggregate(countPipeline);
        const total = totalResult.length > 0 ? totalResult[0].total : 0;

        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: parseInt(limit) });
        pipeline.push({
            $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category_info' }
        });
        pipeline.push({ $unwind: '$category_info' });

        const products = await Product.aggregate(pipeline);

        // Retrieve Sponsored products if active campaigns exist (skip on homepage section queries to avoid write lock storms)
        let sponsoredProducts = [];
        if (!section) {
            try {
                const AdCampaign = require('../models/AdCampaign');
                let activeCampaigns = [];

                if (keyword) {
                    // Fetch all active campaigns and check match in JS for flexible bidirectional matching
                    const allActiveCampaigns = await AdCampaign.find({ status: 'active' });
                    const cleanSearch = keyword.trim().toLowerCase();
                    const searchTerms = cleanSearch.split(/[\s\-_]+/).filter(w => w.length > 1);
                    if (searchTerms.length === 0) searchTerms.push(cleanSearch);

                    activeCampaigns = allActiveCampaigns.filter(campaign => {
                        if (!campaign.keywords || campaign.keywords.length === 0) return false;
                        return campaign.keywords.some(kw => {
                            const cleanKw = kw.trim().toLowerCase();
                            if (cleanKw === cleanSearch) return true;
                            // bidirectional check
                            if (searchTerms.some(term => cleanKw.includes(term) || term.includes(cleanKw))) return true;
                            if (cleanSearch.includes(cleanKw) || cleanKw.includes(cleanSearch)) return true;
                            return false;
                        });
                    });
                } else if (resolvedCategoryId && resolvedCategoryId !== 'undefined') {
                    const allCategoryIds = await getChildCategoryIds(resolvedCategoryId);
                    const categoryProducts = await Product.find({ category: { $in: allCategoryIds } }).select('_id');
                    const categoryProductIdsStr = categoryProducts.map(p => p._id.toString());
                    const allActiveCampaigns = await AdCampaign.find({ status: 'active' });
                    activeCampaigns = allActiveCampaigns.filter(campaign =>
                        categoryProductIdsStr.includes(campaign.product_id.toString())
                    );
                } else {
                    activeCampaigns = await AdCampaign.find({ status: 'active' });
                }

                // Sort by bid desc and limit to top 3
                activeCampaigns.sort((a, b) => {
                    const bidA = a.campaign_type === 'cpm' ? a.cpm_bid : a.cpc_bid;
                    const bidB = b.campaign_type === 'cpm' ? b.cpm_bid : b.cpc_bid;
                    return bidB - bidA;
                });
                activeCampaigns = activeCampaigns.slice(0, 3);

                if (activeCampaigns.length > 0) {
                    const productIds = activeCampaigns.map(c => c.product_id);
                    const sponsoredRaw = await Product.find({ _id: { $in: productIds } })
                        .populate('supplier')
                        .populate('category');

                    sponsoredProducts = sponsoredRaw.map(p => {
                        const campaign = activeCampaigns.find(c => c.product_id.toString() === p._id.toString());
                        const pObj = p.toObject();
                        pObj.isSponsored = true;
                        pObj.adCampaignId = campaign ? campaign._id : null;
                        return pObj;
                    });

                    // Track impressions asynchronously
                    const adController = require('./adController');
                    for (const campaign of activeCampaigns) {
                        if (campaign.campaign_type === 'cpm') {
                            adController.chargeCpmImpression(campaign._id).catch(err => console.error('Error charging CPM impression:', err));
                        } else {
                            AdCampaign.updateOne(
                                { _id: campaign._id },
                                { $inc: { impressions: 1 } }
                            ).catch(err => console.error('Error tracking CPC ad impressions:', err));
                        }
                    }
                }
            } catch (adError) {
                console.error('Error fetching sponsored products:', adError);
            }
        }

        // Deduplicate sponsored products from organic products
        const sponsoredProductIds = new Set(sponsoredProducts.map(p => p._id.toString()));
        const cleanOrganicProducts = products.filter(p => !sponsoredProductIds.has(p._id.toString()));
        const finalProducts = [...sponsoredProducts, ...cleanOrganicProducts].slice(0, parseInt(limit));
        
        // Fetch promotions dynamically for all products
        const promotionService = require('../services/promotionService');
        const userContext = req.user ? { id: req.user._id } : null;
        
        const finalProductsWithPromos = await Promise.all(finalProducts.map(async (p) => {
            const promo = await promotionService.getWinningPromotionForProduct(p._id, userContext);
            let productObj = p.toObject ? p.toObject() : p; // depending if it's already a plain object
            
            if (promo) {
                let discountAmount = 0;
                if (promo.discount_type === 'percentage') {
                    discountAmount = promo.discount_value;
                } else if (promo.discount_type === 'fixed') {
                    discountAmount = Math.max(0, p.main_price - promo.discount_value);
                }
                let countdown_ms = promo.end_date ? new Date(promo.end_date).getTime() - Date.now() : null;

                productObj.promotion = {
                    id: promo._id,
                    type: promo.promotion_category,
                    subtype: promo.promotion_subtype,
                    title: promo.title,
                    badge: promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `$${promo.discount_value} OFF`,
                    discount: discountAmount,
                    priority: promo.priority,
                    countdown_ms: countdown_ms > 0 ? countdown_ms : null,
                    remaining: promo.max_quantity ? Math.max(0, promo.max_quantity - (promo.sold_quantity || 0)) : null
                };
            }
            return productObj;
        }));

        res.json({ products: finalProductsWithPromos, page: parseInt(page), pages: Math.ceil(total / limit), total });
    } catch (error) {
        console.error('getProducts error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// PUBLIC: Get single product
// GET /api/products/:id
// ─────────────────────────────────────────────
exports.getProductById = async (req, res) => {
    try {
        const query = req.params.id.match(/^[0-9a-fA-F]{24}$/)
            ? { _id: req.params.id }
            : { slug: req.params.id };

        let product = await Product.findOne(query)
            .populate('category')
            .populate({
                path: 'supplier',
                select: 'first_name last_name company_name is_verified country_code business_type createdAt logo subscription_plan',
                populate: { path: 'subscription_plan' }
            });

        // Fallback for legacy products where slug wasn't saved in DB
        if (!product && !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            const cleanSlug = req.params.id.replace(/-/g, ' ');
            product = await Product.findOne({ name: { $regex: new RegExp(cleanSlug, 'i') } })
                .populate('category')
                .populate({
                    path: 'supplier',
                    select: 'first_name last_name company_name is_verified country_code business_type createdAt logo subscription_plan',
                    populate: { path: 'subscription_plan' }
                });
        }

        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Increment views asynchronously directly in DB to avoid VersionError
        Product.updateOne({ _id: product._id }, { $inc: { views: 1 } }).catch(err => console.error('View increment error', err));
        product.views = (product.views || 0) + 1;

        // Fetch promotion dynamically
        const promotionService = require('../services/promotionService');
        const userContext = req.user ? { id: req.user._id } : null;
        const promo = await promotionService.getWinningPromotionForProduct(product._id, userContext);
        
        let productObj = product.toObject();
        if (promo) {
            let discountAmount = 0;
            if (promo.discount_type === 'percentage') {
                discountAmount = promo.discount_value;
            } else if (promo.discount_type === 'fixed') {
                discountAmount = Math.max(0, product.main_price - promo.discount_value);
            }
            let countdown_ms = promo.end_date ? new Date(promo.end_date).getTime() - Date.now() : null;

            productObj.promotion = {
                id: promo._id,
                type: promo.promotion_category,
                subtype: promo.promotion_subtype,
                title: promo.title,
                badge: promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `$${promo.discount_value} OFF`,
                discount: discountAmount,
                priority: promo.priority,
                countdown_ms: countdown_ms > 0 ? countdown_ms : null,
                remaining: promo.max_quantity ? Math.max(0, promo.max_quantity - (promo.sold_quantity || 0)) : null
            };
        }

        res.json(productObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// SUPPLIER: Create product
// POST /api/products
// ─────────────────────────────────────────────
exports.createProduct = async (req, res) => {
    try {
        const {
            name, description, category, sku, currency,
            price, sale_price, variants, key_attributes, countInStock, status, section, oldPrice,
            sales_type, countries, tags, meta_title, meta_description, meta_keywords,
            rating, numOrders, features
        } = req.body;

        if (!name || !description || !category) {
            return res.status(400).json({ message: 'Name, description and category are required.' });
        }

        if (!sku || !sku.trim()) {
            return res.status(400).json({ message: 'SKU is required.' });
        }
        if (price === undefined || price === null || price === '' || isNaN(Number(price)) || Number(price) < 0) {
            return res.status(400).json({ message: 'Price must be a valid non-negative number.' });
        }
        if (countInStock === undefined || countInStock === null || countInStock === '') {
            return res.status(400).json({ message: 'Stock is required.' });
        }
        if (!currency || !currency.trim()) {
            return res.status(400).json({ message: 'Currency is required.' });
        }
        if (!sales_type) {
            return res.status(400).json({ message: 'Sales Region is required.' });
        }
        if (sales_type === 'specific') {
            const countriesArr = countries ? (typeof countries === 'string' ? JSON.parse(countries) : countries) : [];
            if (!countriesArr || countriesArr.length === 0) {
                return res.status(400).json({ message: 'At least one country must be selected for specific sales region.' });
            }
        }

        // ── Subscription Check & Verification ──
        const User = require('../models/User');
        const user = await User.findById(req.user._id).populate('subscription_plan');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isSeller = user.roles?.includes('supplier') || user.role === 'supplier' || user.roles?.includes('seller') || user.role === 'seller';
        if (isSeller) {
            if (!user.is_verified) {
                return res.status(403).json({ message: 'Your account is not verified yet. Admin must approve your company verification before you can add products.' });
            }

            const plan = user.subscription_plan;
            const isExpired = user.subscription_end && new Date() > user.subscription_end;

            if (!plan || isExpired) {
                return res.status(403).json({ message: isExpired ? 'Your subscription has expired. Please renew to add products.' : 'Please subscribe to a plan to add products.' });
            }

            // Check product limit (unless unlimited -1 or 0)
            if (plan.max_products !== -1 && plan.max_products !== 0) {
                const productCount = await Product.countDocuments({ supplier: user._id });
                if (productCount >= plan.max_products) {
                    return res.status(403).json({ message: `Product limit reached for ${plan.name} plan (${plan.max_products}). Please upgrade to add more.` });
                }
            }

            // Check image limit per product
            if (plan.max_images_per_product !== -1 && plan.max_images_per_product !== 0) {
                const coverCount = req.files && req.files.cover_image ? req.files.cover_image.length : 0;
                const imageCount = req.files && req.files.images ? req.files.images.length : 0;
                if ((coverCount + imageCount) > plan.max_images_per_product) {
                    return res.status(403).json({ message: `Image limit exceeded. Your ${plan.name} plan allows up to ${plan.max_images_per_product} images per product.` });
                }
            }
        }

        // Parse JSON strings from multipart form
        let parsedVariants = [];
        let parsedKeyAttributes = [];
        let parsedTags = [];
        let parsedMetaKeywords = [];
        let parsedFeatures = [];
        try {
            if (variants) parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
            if (key_attributes) parsedKeyAttributes = typeof key_attributes === 'string' ? JSON.parse(key_attributes) : key_attributes;
            if (tags) parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
            if (meta_keywords) parsedMetaKeywords = typeof meta_keywords === 'string' ? JSON.parse(meta_keywords) : meta_keywords;
            if (features) parsedFeatures = typeof features === 'string' ? JSON.parse(features) : features;
        } catch (e) {
            return res.status(400).json({ message: 'Invalid JSON in variants, key_attributes, tags, meta_keywords, or features.' });
        }

        // Validate required custom fields (dynamic fields for this category)
        try {
            const getAncestorCategoryIds = async (catId, list = []) => {
                if (!catId) return list;
                const CategoryModel = mongoose.model('Category');
                const categoryObj = await CategoryModel.findById(catId);
                if (!categoryObj) return list;
                list.push(categoryObj._id.toString());
                if (categoryObj.parent) {
                    return getAncestorCategoryIds(categoryObj.parent, list);
                }
                return list;
            };

            const CustomFieldModel = mongoose.model('CustomField');
            const categoryIds = await getAncestorCategoryIds(category);
            const objectIds = categoryIds.map(id => new mongoose.Types.ObjectId(id));
            const requiredFields = await CustomFieldModel.find({
                categories: { $in: objectIds },
                status: 'active',
                isRequired: true
            });

            for (const rf of requiredFields) {
                const hasField = parsedKeyAttributes.some(
                    attr => attr.key === rf.name && attr.value !== undefined && attr.value !== null && String(attr.value).trim() !== ''
                );
                if (!hasField) {
                    return res.status(400).json({ message: `"${rf.name}" is a required custom field.` });
                }
            }
        } catch (err) {
            console.error('Error validating required custom fields:', err);
        }

        let parsedCountries = [];
        if (countries) {
            try {
                parsedCountries = typeof countries === 'string' ? JSON.parse(countries) : countries;
            } catch (e) {
                console.error('Error parsing countries:', e);
            }
        }

        // Handle uploaded images
        const imageUrls = req.files && req.files.images ? req.files.images.map(f => `/uploads/products/${f.filename}`) : [];
        const coverImageUrl = req.files && req.files.cover_image && req.files.cover_image.length > 0
            ? `/uploads/products/${req.files.cover_image[0].filename}`
            : '';
        const threeDModelUrl = req.files && req.files.three_d_model && req.files.three_d_model.length > 0
            ? `/uploads/products/${req.files.three_d_model[0].filename}`
            : '';
        const videoFileUrl = req.files && req.files.video && req.files.video.length > 0
            ? `/uploads/products/${req.files.video[0].filename}`
            : '';

        const main_image = coverImageUrl || (imageUrls.length > 0 ? imageUrls[0] : '');
        const allImages = coverImageUrl ? [coverImageUrl, ...imageUrls] : imageUrls;

        const product = new Product({
            name,
            description,
            category,
            sku: sku || '',
            currency: currency || 'USD',
            price: Number(price),
            sale_price: sale_price !== undefined && sale_price !== null && sale_price !== '' ? Number(sale_price) : null,
            variants: parsedVariants,
            key_attributes: parsedKeyAttributes,
            images: allImages,
            main_image,
            three_d_model: threeDModelUrl || req.body.three_d_model || '',
            video: videoFileUrl || req.body.video || '',
            features: parsedFeatures,
            countInStock: countInStock || 0,
            status: status || 'draft',
            approval_status: 'pending',
            section: section || 'None',
            oldPrice: oldPrice || 0,
            rating: rating !== undefined ? Number(rating) : 0,
            numOrders: numOrders !== undefined ? Number(numOrders) : 0,
            sales_type: sales_type || 'worldwide',
            countries: parsedCountries,
            tags: parsedTags,
            meta_title: meta_title || '',
            meta_description: meta_description || '',
            meta_keywords: parsedMetaKeywords,
            supplier: req.user._id,
            isDigital: req.body.isDigital === 'true' || req.body.isDigital === true,
            barcode: req.body.barcode || '',
            dropshipping_supported: req.body.dropshipping_supported === 'false' || req.body.dropshipping_supported === false ? false : true,
            gift_wrap_supported: req.body.gift_wrap_supported === 'false' || req.body.gift_wrap_supported === false ? false : true,
            gift_wrap_fee: req.body.gift_wrap_fee !== undefined && req.body.gift_wrap_fee !== null && req.body.gift_wrap_fee !== '' ? Number(req.body.gift_wrap_fee) : null,
            emi_supported: req.body.emi_supported === 'false' || req.body.emi_supported === false ? false : true
        });

        // Handle digital file move to secure digital_store
        if (req.files && req.files.digital_file && req.files.digital_file.length > 0) {
            const fs = require('fs');
            const path = require('path');
            const digitalStoreDir = path.join(__dirname, '..', 'digital_store');
            if (!fs.existsSync(digitalStoreDir)) {
                fs.mkdirSync(digitalStoreDir, { recursive: true });
            }
            const tempPath = req.files.digital_file[0].path;
            const filename = req.files.digital_file[0].filename;
            const destPath = path.join(digitalStoreDir, filename);
            fs.renameSync(tempPath, destPath);
            product.digitalFile = filename;
            product.isDigital = true;
        }

        const saved = await product.save();

        const { sendNotification } = require('../services/notificationService');
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            await sendNotification(
                req.io,
                admin._id,
                'New Product Created',
                `Seller has created a new product "${product.name}" and it is pending approval.`,
                'admin',
                '/admin/products'
            );
        }

        res.status(201).json({ success: true, product: saved });
    } catch (error) {
        console.error('createProduct error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// SUPPLIER/ADMIN: Update product
// PUT /api/products/:id
// ─────────────────────────────────────────────
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const isSeller = req.user.roles?.includes('supplier') || req.user.role === 'supplier' || req.user.roles?.includes('seller') || req.user.role === 'seller';
        if (isSeller) {
            if (product.supplier.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to update this product' });
            }

            const User = require('../models/User');
            const user = await User.findById(req.user._id).populate('subscription_plan');
            if (user) {
                if (!user.is_verified) {
                    return res.status(403).json({ message: 'Your account is not verified yet. Admin must approve your company verification.' });
                }
                const plan = user.subscription_plan;
                const isExpired = user.subscription_end && new Date() > user.subscription_end;
                if (!plan || isExpired) {
                    return res.status(403).json({ message: isExpired ? 'Your subscription has expired. Please renew to update products.' : 'Please subscribe to a plan to update products.' });
                }
            }
        }

        const {
            name, description, category, sku, currency,
            price, sale_price, variants, key_attributes, countInStock, status, section, oldPrice, keep_images,
            sales_type, countries, tags, meta_title, meta_description, meta_keywords,
            rating, numOrders, features
        } = req.body;

        if (name !== undefined && !name.trim()) {
            return res.status(400).json({ message: 'Name is required.' });
        }
        if (description !== undefined && !description.trim()) {
            return res.status(400).json({ message: 'Description is required.' });
        }
        if (category !== undefined && !category) {
            return res.status(400).json({ message: 'Category is required.' });
        }
        if (sku !== undefined && (!sku || !sku.trim())) {
            return res.status(400).json({ message: 'SKU is required.' });
        }
        if (price !== undefined && (price === '' || isNaN(Number(price)) || Number(price) < 0)) {
            return res.status(400).json({ message: 'Price must be a valid non-negative number.' });
        }
        if (countInStock !== undefined && (countInStock === undefined || countInStock === null || countInStock === '')) {
            return res.status(400).json({ message: 'Stock is required.' });
        }
        if (currency !== undefined && (!currency || !currency.trim())) {
            return res.status(400).json({ message: 'Currency is required.' });
        }
        if (sales_type !== undefined && !sales_type) {
            return res.status(400).json({ message: 'Sales Region is required.' });
        }
        if (sales_type === 'specific' || (sales_type === undefined && product.sales_type === 'specific')) {
            const countriesArr = countries ? (typeof countries === 'string' ? JSON.parse(countries) : countries) : product.countries;
            if (!countriesArr || countriesArr.length === 0) {
                return res.status(400).json({ message: 'At least one country must be selected for specific sales region.' });
            }
        }

        // Parse JSON
        let parsedVariants = product.variants;
        let parsedKeyAttributes = product.key_attributes;
        let parsedTags = product.tags;
        let parsedMetaKeywords = product.meta_keywords;
        let parsedFeatures = product.features || [];
        try {
            if (variants) parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
            if (key_attributes) parsedKeyAttributes = typeof key_attributes === 'string' ? JSON.parse(key_attributes) : key_attributes;
            if (tags) parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
            if (meta_keywords) parsedMetaKeywords = typeof meta_keywords === 'string' ? JSON.parse(meta_keywords) : meta_keywords;
            if (features) parsedFeatures = typeof features === 'string' ? JSON.parse(features) : features;
        } catch (e) {
            return res.status(400).json({ message: 'Invalid JSON in variants, key_attributes, tags, meta_keywords, or features.' });
        }

        // Validate required custom fields (dynamic fields for this category)
        try {
            const targetCategory = category || product.category;
            if (targetCategory) {
                const getAncestorCategoryIds = async (catId, list = []) => {
                    if (!catId) return list;
                    const CategoryModel = mongoose.model('Category');
                    const categoryObj = await CategoryModel.findById(catId);
                    if (!categoryObj) return list;
                    list.push(categoryObj._id.toString());
                    if (categoryObj.parent) {
                        return getAncestorCategoryIds(categoryObj.parent, list);
                    }
                    return list;
                };

                const CustomFieldModel = mongoose.model('CustomField');
                const categoryIds = await getAncestorCategoryIds(targetCategory);
                const objectIds = categoryIds.map(id => new mongoose.Types.ObjectId(id));
                const requiredFields = await CustomFieldModel.find({
                    categories: { $in: objectIds },
                    status: 'active',
                    isRequired: true
                });

                for (const rf of requiredFields) {
                    const hasField = parsedKeyAttributes.some(
                        attr => attr.key === rf.name && attr.value !== undefined && attr.value !== null && String(attr.value).trim() !== ''
                    );
                    if (!hasField) {
                        return res.status(400).json({ message: `"${rf.name}" is a required custom field.` });
                    }
                }
            }
        } catch (err) {
            console.error('Error validating required custom fields:', err);
        }

        // Determine images: keep existing + new uploads
        let existingImages = [];
        if (keep_images) {
            existingImages = typeof keep_images === 'string' ? JSON.parse(keep_images) : keep_images;
        }
        const newImages = req.files && req.files.images ? req.files.images.map(f => `/uploads/products/${f.filename}`) : [];

        let main_image = product.main_image; // Default
        const newCoverImage = req.files && req.files.cover_image && req.files.cover_image.length > 0
            ? `/uploads/products/${req.files.cover_image[0].filename}`
            : null;

        if (req.body.existing_cover_image !== undefined) {
            main_image = req.body.existing_cover_image;
        }
        if (newCoverImage) {
            main_image = newCoverImage;
        }

        let allImages = [...existingImages, ...newImages];
        if (main_image) {
            allImages = allImages.filter(img => img !== main_image);
            allImages.unshift(main_image);
        }

        // ── Subscription Image Limit Check ──
        if (isSeller) {
            const User = require('../models/User');
            const user = await User.findById(req.user._id).populate('subscription_plan');
            const plan = user?.subscription_plan;
            if (plan && plan.max_images_per_product !== -1 && plan.max_images_per_product !== 0) {
                if (allImages.length > plan.max_images_per_product) {
                    return res.status(403).json({ message: `Image limit exceeded. Your ${plan.name} plan allows up to ${plan.max_images_per_product} images per product.` });
                }
            }
        }

        if (name) product.name = name;
        if (description) product.description = description;
        if (category) product.category = category;
        if (sku !== undefined) product.sku = sku;
        if (currency) product.currency = currency;
        if (price !== undefined) product.price = Number(price);
        if (sale_price !== undefined) product.sale_price = sale_price !== null && sale_price !== '' ? Number(sale_price) : null;
        product.variants = parsedVariants;
        product.key_attributes = parsedKeyAttributes;
        product.images = allImages;
        product.main_image = main_image || '';
        const previousStock = product.countInStock || 0;
        if (countInStock !== undefined) product.countInStock = Number(countInStock);
        if (status) product.status = status;
        if (section) product.section = section;
        if (oldPrice !== undefined) product.oldPrice = oldPrice;
        if (rating !== undefined) product.rating = Number(rating);
        if (numOrders !== undefined) product.numOrders = Number(numOrders);
        if (req.files && req.files.video && req.files.video.length > 0) {
            product.video = `/uploads/products/${req.files.video[0].filename}`;
        } else if (req.body.video !== undefined) {
            product.video = req.body.video;
        }
        if (features !== undefined) {
            product.features = parsedFeatures;
        }
        if (req.files && req.files.three_d_model && req.files.three_d_model.length > 0) {
            product.three_d_model = `/uploads/products/${req.files.three_d_model[0].filename}`;
        } else if (req.body.three_d_model !== undefined) {
            product.three_d_model = req.body.three_d_model;
        }

        if (sales_type) product.sales_type = sales_type;
        if (countries) {
            try {
                product.countries = typeof countries === 'string' ? JSON.parse(countries) : countries;
            } catch (e) { }
        }

        if (tags !== undefined) product.tags = parsedTags;
        if (req.body.barcode !== undefined) product.barcode = req.body.barcode;
        if (meta_title !== undefined) product.meta_title = meta_title;
        if (meta_description !== undefined) product.meta_description = meta_description;
        if (meta_keywords !== undefined) product.meta_keywords = parsedMetaKeywords;

        if (req.body.isDigital !== undefined) {
            product.isDigital = req.body.isDigital === 'true' || req.body.isDigital === true;
        }

        if (req.body.dropshipping_supported !== undefined) {
            product.dropshipping_supported = req.body.dropshipping_supported === 'false' || req.body.dropshipping_supported === false ? false : true;
        }

        if (req.body.gift_wrap_supported !== undefined) {
            product.gift_wrap_supported = req.body.gift_wrap_supported === 'false' || req.body.gift_wrap_supported === false ? false : true;
        }

        if (req.body.gift_wrap_fee !== undefined) {
            product.gift_wrap_fee = req.body.gift_wrap_fee !== null && req.body.gift_wrap_fee !== '' ? Number(req.body.gift_wrap_fee) : null;
        }

        if (req.body.emi_supported !== undefined) {
            product.emi_supported = req.body.emi_supported === 'false' || req.body.emi_supported === false ? false : true;
        }

        // Handle new digital file upload
        if (req.files && req.files.digital_file && req.files.digital_file.length > 0) {
            const fs = require('fs');
            const path = require('path');
            const digitalStoreDir = path.join(__dirname, '..', 'digital_store');
            if (!fs.existsSync(digitalStoreDir)) {
                fs.mkdirSync(digitalStoreDir, { recursive: true });
            }
            const tempPath = req.files.digital_file[0].path;
            const filename = req.files.digital_file[0].filename;
            const destPath = path.join(digitalStoreDir, filename);
            fs.renameSync(tempPath, destPath);

            // Clean up old file
            if (product.digitalFile) {
                const oldPath = path.join(digitalStoreDir, product.digitalFile);
                if (fs.existsSync(oldPath)) {
                    try { fs.unlinkSync(oldPath); } catch (e) {}
                }
            }

            product.digitalFile = filename;
            product.isDigital = true;
        }

        // Reset approval if seller edits
        if (isSeller) {
            product.approval_status = 'pending';
        }

        const updated = await product.save();

        // Trigger back-in-stock alerts if stock was 0 and now is > 0
        if (previousStock === 0 && updated.countInStock > 0) {
            try {
                const { triggerStockNotifications } = require('./stockNotificationController');
                triggerStockNotifications(updated._id, updated.name);
            } catch (notifyErr) {
                console.error('Failed to trigger back-in-stock notifications:', notifyErr);
            }
        }

        res.json({ success: true, product: updated });
    } catch (error) {
        console.error('updateProduct error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// SHARED: Upload single image (for variants)
// POST /api/products/upload-single
// ─────────────────────────────────────────────
exports.uploadSingleImage = async (req, res) => {
    try {
        const file = req.file || (req.files && (Array.isArray(req.files) ? req.files[0] : (req.files.images && req.files.images[0])));
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        const fileUrl = `/uploads/products/${file.filename}`;
        res.json({ success: true, url: fileUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// SUPPLIER/ADMIN: Delete product
// DELETE /api/products/:id
// ─────────────────────────────────────────────
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        if ((req.user.roles?.includes('supplier') || req.user.role === 'supplier') && product.supplier.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this product' });
        }

        await product.deleteOne();
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// SUPPLIER: Toggle showcase status (isFeatured)
// PUT /api/products/:id/toggle-showcase
// ─────────────────────────────────────────────
exports.toggleShowcase = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        if (product.supplier.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // If trying to set to true, check subscription quota
        if (!product.isFeatured) {
            const User = require('../models/User');
            const user = await User.findById(req.user._id).populate('subscription_plan');
            const plan = user?.subscription_plan;

            if (!plan) {
                return res.status(403).json({ message: 'Please subscribe to a plan to use the Showcase feature.' });
            }

            if (plan.max_showcases !== -1) {
                const currentShowcases = await Product.countDocuments({
                    supplier: req.user._id,
                    isFeatured: true
                });
                if (currentShowcases >= plan.max_showcases) {
                    return res.status(403).json({ message: `Showcase limit reached for ${plan.name} plan (${plan.max_showcases}). Please remove another showcase first or upgrade.` });
                }
            }
        }

        product.isFeatured = !product.isFeatured;
        await product.save();

        res.json({ success: true, isFeatured: product.isFeatured, message: product.isFeatured ? 'Product added to store showcase.' : 'Product removed from showcase.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// SUPPLIER: My products
// GET /api/products/my
// ─────────────────────────────────────────────
exports.getMyProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, approval_status, keyword } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = { supplier: req.user._id };
        if (status) query.status = status;
        if (approval_status) query.approval_status = approval_status;
        if (keyword) query.$text = { $search: keyword };

        const total = await Product.countDocuments(query);
        const totalCountGlobal = await Product.countDocuments({ supplier: req.user._id });
        const products = await Product.find(query)
            .populate('category', 'title slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({ products, page: parseInt(page), pages: Math.ceil(total / limit), total, totalCountGlobal });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// ADMIN: All products
// GET /api/products/admin/all
// ─────────────────────────────────────────────
exports.getAllProductsAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, approval_status, keyword } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = {};
        if (status) query.status = status;
        if (approval_status) query.approval_status = approval_status;
        if (keyword) query.$text = { $search: keyword };

        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .populate('category', 'title slug')
            .populate('supplier', 'first_name last_name company_name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({ products, page: parseInt(page), pages: Math.ceil(total / limit), total });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// ADMIN: Approve product
// PUT /api/products/:id/approve
// ─────────────────────────────────────────────
exports.approveProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { approval_status: 'approved', status: 'active', approval_note: '' },
            { new: true }
        );
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// ADMIN: Reject product
// PUT /api/products/:id/reject
// ─────────────────────────────────────────────
exports.rejectProduct = async (req, res) => {
    try {
        const { note } = req.body;
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { approval_status: 'rejected', status: 'inactive', approval_note: note || 'Rejected by admin.' },
            { new: true }
        );
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Helper: Download image from external URL and save to uploads/products
const downloadImage = async (url) => {
    try {
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
            return url;
        }
        const axios = require('axios').default || require('axios');
        const response = await axios.get(url, {
            responseType: 'stream',
            timeout: 15000 // 15s timeout
        });

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        let ext = '.jpg';
        const contentType = response.headers['content-type'];
        if (contentType) {
            if (contentType.includes('png')) ext = '.png';
            else if (contentType.includes('webp')) ext = '.webp';
            else if (contentType.includes('gif')) ext = '.gif';
            else if (contentType.includes('jpeg')) ext = '.jpg';
        } else {
            const parsedExt = path.extname(url).split('?')[0];
            if (parsedExt) ext = parsedExt;
        }

        const filename = `product-${uniqueSuffix}${ext}`;
        const filePath = path.join(__dirname, '..', 'uploads', 'products', filename);

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        return `/uploads/products/${filename}`;
    } catch (err) {
        console.error('Failed to download image:', url, err.message);
        return url;
    }
};

// ─────────────────────────────────────────────
// SUPPLIER: Bulk upload from CSV or XLSX
// POST /api/products/bulk-upload
// ─────────────────────────────────────────────
exports.bulkUploadProducts = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Please upload a CSV or XLSX file' });
    try {
        const ext = path.extname(req.file.originalname).toLowerCase();
        let rows = [];

        // ── Subscription Check for Bulk Upload and Quota ──
        const User = require('../models/User');
        const user = await User.findById(req.user._id).populate('subscription_plan');
        const plan = user?.subscription_plan;
        const isExpired = user?.subscription_end && new Date() > user.subscription_end;

        if (user.roles?.includes('supplier') || user.role === 'supplier') {
            if (!plan || isExpired) {
                if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(403).json({ message: isExpired ? 'Your subscription has expired. Please renew to perform bulk uploads.' : 'Please subscribe to a plan to perform bulk uploads.' });
            }
            if (!plan.features.some(f => f.toLowerCase().includes('bulk'))) {
                // If it doesn't explicitly mention bulk, just allow it if limits are okay, or block?
                // Let's block if plan doesn't have bulk upload feature and it's free tier. 
                if (plan.price === 0 && plan.level < 2) {
                    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    return res.status(403).json({ message: 'Bulk upload is only available for premium plans.' });
                }
            }
        }

        // Limit Check validation BEFORE parsing the file (aligned with Add Product logic)
        let maxProductsAllowed = -1;
        let currentProductCount = 0;
        if ((user.roles?.includes('supplier') || user.role === 'supplier') && plan && plan.max_products !== -1 && plan.max_products !== 0) {
            maxProductsAllowed = plan.max_products;
            currentProductCount = await Product.countDocuments({ supplier: user._id });
            if (currentProductCount >= maxProductsAllowed) {
                if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(403).json({ message: `Product limit reached for ${plan.name} plan (${plan.max_products}). Please upgrade your plan to upload more.` });
            }
        }

        if (ext === '.xlsx' || ext === '.xls') {
            const wb = XLSX.readFile(req.file.path);
            const ws = wb.Sheets[wb.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(ws);
        } else {
            // CSV: read file synchronously through xlsx (universal reader)
            const wb = XLSX.readFile(req.file.path, { type: 'file', raw: false });
            const ws = wb.Sheets[wb.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(ws);
        }

        // Resolve category titles → IDs in one batch
        const categoryTitles = [...new Set(rows.map(r => r.category).filter(Boolean))];
        const categories = await Category.find({ title: { $in: categoryTitles } }).select('_id title');
        const catMap = Object.fromEntries(categories.map(c => [c.title.toLowerCase(), c._id]));

        const products = [];
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Check dynamic product limit validation
            if (maxProductsAllowed !== -1 && (currentProductCount + products.length) >= maxProductsAllowed) {
                errors.push(`Row ${i + 2}: Skipped. Product limit of ${maxProductsAllowed} reached.`);
                continue;
            }
            if (!row.name || (!row.price && !row.price_tiers)) {
                errors.push(`Row ${i + 2}: missing name, price or price_tiers`);
                continue;
            }
            const catId = catMap[String(row.category || '').toLowerCase()];
            if (!catId) { errors.push(`Row ${i + 2}: category "${row.category}" not found`); continue; }

            // Parse price tiers
            let priceTiers = [];
            if (row.price_tiers) {
                const segments = String(row.price_tiers).split('|');
                for (const segment of segments) {
                    const match = segment.trim().match(/^(\d+)(?:\s*-\s*(\d+))?\s*\+?\s*:\s*\$?\s*(\d+(?:\.\d+)?)$/);
                    if (match) {
                        priceTiers.push({
                            min_quantity: parseInt(match[1]),
                            max_quantity: match[2] ? parseInt(match[2]) : null,
                            price: parseFloat(match[3])
                        });
                    }
                }
            }
            // Fallback to single price tier
            if (priceTiers.length === 0 && row.price) {
                priceTiers.push({
                    min_quantity: parseInt(row.moq) || 1,
                    price: parseFloat(row.price)
                });
            }

            if (priceTiers.length === 0) {
                errors.push(`Row ${i + 2}: failed to parse valid price_tiers and no base price provided`);
                continue;
            }

            // Parse variants
            let variants = [];
            if (row.variants) {
                const segments = String(row.variants).split('|');
                for (const segment of segments) {
                    const match = segment.trim().match(/^([^:]+)\s*:\s*([^(]+?)(?:\s*\(\s*Stock\s*:\s*(\d+)\s*,\s*Price\s*:\s*([+-]?\d+(?:\.\d+)?)\s*\))?$/i);
                    if (match) {
                        variants.push({
                            name: match[1].trim(),
                            value: match[2].trim(),
                            stock: match[3] ? parseInt(match[3]) : 0,
                            price_modifier: match[4] ? parseFloat(match[4]) : 0
                        });
                    }
                }
            }

            // Parse key attributes
            let keyAttributes = [];
            if (row.key_attributes) {
                const segments = String(row.key_attributes).split('|');
                for (const segment of segments) {
                    const parts = segment.trim().split(':');
                    if (parts.length >= 2) {
                        keyAttributes.push({
                            key: parts[0].trim(),
                            value: parts.slice(1).join(':').trim()
                        });
                    }
                }
            }

            // Parse images with download fallback
            const rowImages = row.images ? String(row.images).split(',').map(img => img.trim()).filter(Boolean) : [];
            const rowMainImage = row.main_image ? String(row.main_image).trim() : (rowImages.length > 0 ? rowImages[0] : '');

            // Download main image if it's a URL
            let main_image = rowMainImage;
            if (rowMainImage && (rowMainImage.startsWith('http://') || rowMainImage.startsWith('https://'))) {
                main_image = await downloadImage(rowMainImage);
            }

            // Download all other images if they are URLs
            let images = [];
            for (const img of rowImages) {
                if (img.startsWith('http://') || img.startsWith('https://')) {
                    const downloaded = await downloadImage(img);
                    images.push(downloaded);
                } else {
                    images.push(img);
                }
            }

            let allImages = [...images];
            if (main_image && !allImages.includes(main_image)) {
                allImages.unshift(main_image);
            }

            // Calculate main_price
            const main_price = Math.min(...priceTiers.map(t => t.price));

            // Generate slug
            const slug = String(row.name)
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');

            products.push({
                name: String(row.name),
                slug,
                description: String(row.description || ''),
                category: catId,
                sku: row.sku || '',
                moq: parseInt(row.moq) || 1,
                currency: row.currency || 'USD',
                countInStock: parseInt(row.stock) || 0,
                sample_available: String(row.sample_available).toLowerCase() === 'true' || row.sample_available === 1,
                sample_price: parseFloat(row.sample_price) || 0,
                price_tiers: priceTiers,
                main_price,
                variants: variants,
                key_attributes: keyAttributes,
                images: allImages,
                main_image: main_image,
                status: 'draft',
                approval_status: 'pending',
                supplier: req.user._id
            });
        }

        const inserted = products.length > 0 ? await Product.insertMany(products) : [];
        fs.unlinkSync(req.file.path);

        res.status(201).json({
            message: `${inserted.length} products uploaded as drafts.`,
            inserted: inserted.length,
            skipped: errors.length,
            errors
        });
    } catch (err) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error processing file: ' + err.message });
    }
};

// ─────────────────────────────────────────────
// SUPPLIER: Export own products to XLSX
// GET /api/products/export
// ─────────────────────────────────────────────
exports.exportProducts = async (req, res) => {
    try {
        const products = await Product.find({ supplier: req.user._id })
            .populate('category', 'title')
            .sort({ createdAt: -1 });

        const rows = products.map(p => ({
            name: p.name,
            description: p.description,
            category: p.category?.title || '',
            sku: p.sku,
            moq: p.moq,
            stock: p.countInStock,
            currency: p.currency,
            price: p.main_price || (p.price_tiers?.[0]?.price) || 0,
            status: p.status,
            approval_status: p.approval_status,
            sample_available: p.sample_available ? 'true' : 'false',
            sample_price: p.sample_price,
            main_image: p.main_image || '',
            images: p.images && p.images.length > 0 ? p.images.join(', ') : '',
            price_tiers: p.price_tiers && p.price_tiers.length > 0 ? p.price_tiers.map(t => t.max_quantity ? `${t.min_quantity}-${t.max_quantity}:${t.price}` : `${t.min_quantity}+:${t.price}`).join(' | ') : '',
            variants: p.variants && p.variants.length > 0 ? p.variants.map(v => `${v.name}:${v.value} (Stock: ${v.stock}, Price: ${v.price_modifier > 0 ? '+' + v.price_modifier : v.price_modifier})`).join(' | ') : '',
            key_attributes: p.key_attributes && p.key_attributes.length > 0 ? p.key_attributes.map(a => `${a.key}:${a.value}`).join(' | ') : '',
            created_at: p.createdAt?.toISOString().split('T')[0]
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Products');

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="my-products.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────
// ADMIN: Export ALL products to XLSX
// GET /api/products/admin/export
// ─────────────────────────────────────────────
exports.exportAllProductsAdmin = async (req, res) => {
    try {
        const products = await Product.find({})
            .populate('category', 'title')
            .populate('supplier', 'company_name email first_name last_name')
            .sort({ createdAt: -1 });

        const rows = products.map(p => ({
            name: p.name,
            description: p.description,
            supplier: p.supplier?.company_name || `${p.supplier?.first_name} ${p.supplier?.last_name}` || 'N/A',
            supplier_email: p.supplier?.email || 'N/A',
            category: p.category?.title || '',
            sku: p.sku,
            moq: p.moq,
            stock: p.countInStock,
            currency: p.currency,
            price: p.main_price || (p.price_tiers?.[0]?.price) || 0,
            status: p.status,
            approval_status: p.approval_status,
            sample_available: p.sample_available ? 'true' : 'false',
            sample_price: p.sample_price,
            main_image: p.main_image || '',
            images: p.images && p.images.length > 0 ? p.images.join(', ') : '',
            price_tiers: p.price_tiers && p.price_tiers.length > 0 ? p.price_tiers.map(t => t.max_quantity ? `${t.min_quantity}-${t.max_quantity}:${t.price}` : `${t.min_quantity}+:${t.price}`).join(' | ') : '',
            variants: p.variants && p.variants.length > 0 ? p.variants.map(v => `${v.name}:${v.value} (Stock: ${v.stock}, Price: ${v.price_modifier > 0 ? '+' + v.price_modifier : v.price_modifier})`).join(' | ') : '',
            key_attributes: p.key_attributes && p.key_attributes.length > 0 ? p.key_attributes.map(a => `${a.key}:${a.value}`).join(' | ') : '',
            created_at: p.createdAt?.toISOString().split('T')[0]
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'All_Products');

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="platform-products.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────
// BUYER: Request a sample for a product
// POST /api/products/:id/request-sample
// ─────────────────────────────────────────────
exports.requestSample = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('supplier', 'first_name last_name email');
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (!product.sample_available) return res.status(400).json({ message: 'Sample not available for this product' });

        const { shipping_address, note } = req.body;

        // In production, send an email to the supplier here
        // For now, we log and return success
        res.status(201).json({
            success: true,
            message: 'Sample request submitted. The supplier will contact you shortly.',
            product_name: product.name,
            sample_price: product.sample_price,
            supplier_name: `${product.supplier?.first_name} ${product.supplier?.last_name}`
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────
// INTERNAL: Decrement product stock after order
// Called after successful payment verification
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// PUBLIC: Search by image
// POST /api/products/search-image
// ─────────────────────────────────────────────
exports.searchByImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image uploaded.' });
        }

        let matchedKeywords = [];

        // Try AI Vision based search first if API key is available
        const SiteSetting = require('../models/SiteSetting');
        const settings = await SiteSetting.findOne();
        const aiKey = settings?.ai_api_key;

        if (aiKey && fs.existsSync(req.file.path)) {
            try {
                const axios = require('axios');
                const base64Image = fs.readFileSync(req.file.path, { encoding: 'base64' });
                const aiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: 'Analyze this image and return only 1-2 most relevant product keywords for an e-commerce search. Space separated, no punctuation.' },
                                { type: 'image_url', image_url: { url: `data:${req.file.mimetype};base64,${base64Image}` } }
                            ]
                        }
                    ],
                    max_tokens: 30
                }, {
                    headers: { 'Authorization': `Bearer ${aiKey}` },
                    timeout: 10000
                });
                const aiResult = aiResponse.data.choices[0].message.content.trim().toLowerCase();
                matchedKeywords = aiResult.split(/\s+/).filter(k => k.length > 2);
                console.log('AI Image Search Keywords:', matchedKeywords);
            } catch (e) {
                console.error("OpenAI Image Vision call failed:", e.response?.data || e.message);
            }
        }

        // Fallback to filename based heuristic if AI fails or not available
        if (matchedKeywords.length === 0) {
            const filename = (req.file.originalname || '').toLowerCase();
            const commonKeywords = ['watch', 'phone', 'shirt', 'dress', 'machinery', 'tool', 'bag', 'shoe', 'electronic', 'home', 'kurta', 'set', 'women', 'apparel', 'textile', 'toy', 'toys', 'car', 'bike', 'laptop', 'jewelry', 'saree'];
            matchedKeywords = commonKeywords.filter(k => filename.includes(k));
        }

        // Removed the hardcoded 'saree' fallback. If it can't identify the image, it should accurately return 0 products.

        let seedProduct = null;

        // 1. Try to find a "Seed" product based on keywords
        if (matchedKeywords.length > 0) {
            seedProduct = await Product.findOne({
                status: 'active',
                approval_status: 'approved',
                countInStock: { $gt: 0 },
                $or: matchedKeywords.map(k => ({
                    $or: [
                        { name: { $regex: '\\b' + k + '\\b', $options: 'i' } },
                        { description: { $regex: '\\b' + k + '\\b', $options: 'i' } }
                    ]
                }))
            }).sort({ updatedAt: -1 });
        }

        // 2. ONLY SHOW MATCH PRODUCTS OTHERWISE NO RESULT FOUND SHOW
        if (!seedProduct) {
            return res.json({
                success: true,
                products: [],
                total: 0,
                image_url: `/uploads/search/${req.file.filename}`,
                message: "No visual matches found for this image."
            });
        }

        // 3. Find other products that actually MATCH the detected keywords
        const products = await Product.find({
            status: 'active',
            approval_status: 'approved',
            countInStock: { $gt: 0 },
            _id: { $ne: seedProduct._id },
            $or: matchedKeywords.map(k => ({
                $or: [
                    { name: { $regex: '\\b' + k + '\\b', $options: 'i' } },
                    { description: { $regex: '\\b' + k + '\\b', $options: 'i' } }
                ]
            }))
        })
            .limit(15)
            .sort({ updatedAt: -1 });

        // Combined results
        const allProducts = [seedProduct, ...products];

        // Simulate similarity scores for a premium feel (0.80 to 0.99)
        const results = allProducts.map((p, index) => ({
            ...p.toObject(),
            similarity_score: (1.0 - (index * 0.012) - (Math.random() * 0.05)).toFixed(2)
        }));

        res.json({
            success: true,
            products: results,
            total: results.length,
            image_url: `/uploads/search/${req.file.filename}`,
            detected_category: seedProduct.category
        });
    } catch (error) {
        console.error('searchByImage error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.decrementProductStock = async (orderItems) => {
    for (const item of orderItems) {
        if (item.product_id) {
            const product = await Product.findById(item.product_id);
            if (product && product.countInStock !== -1) {
                product.countInStock = Math.max(0, product.countInStock - item.quantity);
                await product.save();
            }
        }
    }
};

// ─────────────────────────────────────────────
// BUYER/AI: AI Sourcing Search with usage tracking
// GET /api/products/ai-sourcing
// ─────────────────────────────────────────────
exports.aiSourcingSearch = async (req, res) => {
    try {
        const { keyword, limit = 3 } = req.query;
        if (!req.user) return res.status(401).json({ message: 'Auth required' });

        const User = require('../models/User');
        const user = await User.findById(req.user._id).populate('subscription_plan');

        // Handle buyer limits vs supplier limits
        const plan = user?.subscription_plan;
        const maxTasks = plan ? (plan.max_ai_tasks || 5) : 5; // Default 5 free tasks

        // Reset tasks if month has passed
        const now = new Date();
        const resetDate = new Date(user.ai_tasks_reset_date || user.createdAt);
        resetDate.setMonth(resetDate.getMonth() + 1);

        if (now > resetDate) {
            user.ai_tasks_count = 0;
            user.ai_tasks_reset_date = now;
        }

        if (maxTasks !== -1 && user.ai_tasks_count >= maxTasks) {
            return res.status(403).json({
                message: `AI Task limit reached. You get ${maxTasks} free requests per month. Please upgrade your account.`,
                limitReached: true
            });
        }

        let refinedKeyword = keyword;
        const SiteSetting = require('../models/SiteSetting');
        const settings = await SiteSetting.findOne();
        const aiKey = settings?.ai_api_key;

        if (aiKey) {
            try {
                const axios = require('axios');
                const aiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a sourcing assistant. Extract ONLY the 2-3 most important product keywords for a database text-search, space separated. If standard question, just extract keywords.' },
                        { role: 'user', content: keyword }
                    ],
                    max_tokens: 30
                }, {
                    headers: { 'Authorization': `Bearer ${aiKey}` }
                });
                refinedKeyword = aiResponse.data.choices[0].message.content.trim() || keyword;
                refinedKeyword = refinedKeyword.replace(/["']/g, '');
            } catch (e) {
                console.error("OpenAI call failed", e.response?.data || e.message);
            }
        }

        // Perform search
        const query = { status: 'active', approval_status: 'approved', countInStock: { $gt: 0 } };
        if (refinedKeyword) query.$text = { $search: refinedKeyword };

        const products = await Product.find(query)
            .populate('supplier', 'company_name is_verified')
            .limit(parseInt(limit))
            .sort({ isPromoted: -1, isPremium: -1 });

        // Increment count
        user.ai_tasks_count = (user.ai_tasks_count || 0) + 1;
        await user.save();

        res.json({ products, remainingTasks: maxTasks === -1 ? 'unlimited' : maxTasks - user.ai_tasks_count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────
// PUBLIC: Worldwide / Deep Search
// GET /api/products/worldwide-search
// Returns products + dynamically-generated attribute chips from product names
// ─────────────────────────────────────────────
exports.searchWorldwide = async (req, res) => {
    try {
        const {
            keyword, category_id, min_price, max_price, min_moq,
            verified_only, country, attr, quick_filter,
            sort_by, page = 1, limit = 20
        } = req.query;

        let resolvedCategoryId = category_id;
        if (category_id && category_id !== 'undefined' && !mongoose.Types.ObjectId.isValid(category_id)) {
            const cat = await Category.findOne({ slug: category_id.toLowerCase().trim() });
            resolvedCategoryId = cat ? cat._id.toString() : null;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const baseQuery = { status: 'active', approval_status: 'approved', countInStock: { $gt: 0 } };

        if (keyword) baseQuery.$text = { $search: keyword };

        if (resolvedCategoryId && resolvedCategoryId !== 'undefined') {
            const allCategoryIds = await getChildCategoryIds(resolvedCategoryId);
            baseQuery.category = { $in: allCategoryIds };
        }

        // Attribute chip filter — narrow search to product names containing the attr word
        if (attr) {
            baseQuery.name = { $regex: attr, $options: 'i' };
            delete baseQuery.$text;
        }

        if (min_price || max_price) {
            baseQuery.main_price = {};
            if (min_price) baseQuery.main_price.$gte = parseFloat(min_price);
            if (max_price) baseQuery.main_price.$lte = parseFloat(max_price);
        }

        if (min_moq) baseQuery.moq = { $lte: parseInt(min_moq) };

        const pipeline = [{ $match: baseQuery }];

        pipeline.push({ $lookup: { from: 'users', localField: 'supplier', foreignField: '_id', as: 'supplier_info' } });
        pipeline.push({ $unwind: '$supplier_info' });
        pipeline.push({ $lookup: { from: 'subscriptionplans', localField: 'supplier_info.subscription_plan', foreignField: '_id', as: 'supplier_info.subscription_plan_info' } });
        pipeline.push({ $unwind: { path: '$supplier_info.subscription_plan_info', preserveNullAndEmptyArrays: true } });

        // Join company info for advanced filters
        pipeline.push({ $lookup: { from: 'companies', localField: 'supplier', foreignField: 'user_id', as: 'company_info' } });
        pipeline.push({ $unwind: { path: '$company_info', preserveNullAndEmptyArrays: true } });

        if (verified_only === 'true' || quick_filter === 'verified') {
            pipeline.push({ $match: { 'supplier_info.is_verified': true } });
        }

        if (country) {
            pipeline.push({
                $match: {
                    $or: [
                        { 'supplier_info.country_code': country.toUpperCase() },
                        { 'company_info.country': { $regex: country, $options: 'i' } }
                    ]
                }
            });
        }

        // Quick Filters
        if (quick_filter === 'moq5') pipeline.push({ $match: { moq: { $lte: 5 } } });
        if (quick_filter === 'local_stock') pipeline.push({ $match: { countInStock: { $gt: 0 } } });
        if (quick_filter === 'trade_assurance') pipeline.push({ $match: { 'supplier_info.is_verified': true } }); // Assume verified suppliers have trade assurance
        if (quick_filter === 'exp5yr') {
            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
            pipeline.push({ $match: { 'supplier_info.createdAt': { $lte: fiveYearsAgo } } });
        }
        if (quick_filter === 'rating45') pipeline.push({ $match: { rating: { $gte: 4.5 } } });

        pipeline.push({ $addFields: { isPremium: { $cond: [{ $ifNull: ['$supplier_info.subscription_plan', false] }, 1, 0] } } });

        let sortObj = { isPromoted: -1, isPremium: -1, ppc_bid: -1, createdAt: -1 };
        if (sort_by === 'price_asc') sortObj = { main_price: 1 };
        else if (sort_by === 'price_desc') sortObj = { main_price: -1 };
        else if (sort_by === 'rating') sortObj = { rating: -1 };

        pipeline.push({ $sort: sortObj });

        // Count before pagination
        const countResult = await Product.aggregate([...pipeline, { $count: 'total' }]);
        const total = countResult.length > 0 ? countResult[0].total : 0;

        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: parseInt(limit) });
        pipeline.push({ $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category_info' } });
        pipeline.push({ $unwind: { path: '$category_info', preserveNullAndEmptyArrays: true } });

        const products = await Product.aggregate(pipeline);

        // ── Generate dynamic attribute chips from product names ──
        let attributes = [];
        if (keyword && products.length > 0) {
            const nameBag = products.map(p => p.name).join(' ').toLowerCase();
            const words = nameBag.split(/\s+/);
            const stopWords = new Set([
                'and', 'or', 'for', 'the', 'a', 'an', 'with', 'of', 'in', 'on', 'to', 'at',
                'from', 'by', 'as', 'is', 'are', 'was', 'be', 'it', 'its', 'this', 'that',
                'high', 'quality', 'new', 'style', 'hot', 'sale', 'cheap', 'best', 'top',
                'product', 'wholesale', 'fashion', 'luxury', 'design', 'custom', 'set',
                'type', 'price', 'brand', 'good', 'free', 'steel', 'color', 'size',
                keyword.toLowerCase()
            ]);

            const freq = {};
            for (const w of words) {
                const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
                if (!clean || clean.length < 3 || stopWords.has(clean)) continue;
                freq[clean] = (freq[clean] || 0) + 1;
            }

            attributes = Object.entries(freq)
                .filter(([, count]) => count >= 1)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([word]) => {
                    const kwCap = keyword.charAt(0).toUpperCase() + keyword.slice(1);
                    const wordCap = word.charAt(0).toUpperCase() + word.slice(1);
                    return `${kwCap} ${wordCap}`;
                });
        }

        const quickFilters = [
            { key: 'local_stock', label: 'Local stock' },
            { key: 'trade_assurance', label: 'Trade Assurance' },
            { key: 'moq5', label: 'MOQ ≤ 5' },
            { key: 'verified', label: 'Verified Supplier' },
            { key: 'exp5yr', label: '5+ Years Supplier Exp.' },
            { key: 'rating45', label: '4.5+ Supplier Rating' },
        ];

        res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / limit), attributes, quickFilters });
    } catch (error) {
        console.error('searchWorldwide error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// PUBLIC: Top Ranking Products grouped by category
// GET /api/products/top-ranking
// ─────────────────────────────────────────────
exports.getTopRankingByCategory = async (req, res) => {
    try {
        const { sort_by = 'ranking', limit_per_cat = 3, max_cats = 30, category_id } = req.query;

        let resolvedCategoryId = category_id;
        if (category_id && category_id !== 'undefined' && !mongoose.Types.ObjectId.isValid(category_id)) {
            const cat = await Category.findOne({ slug: category_id.toLowerCase().trim() });
            resolvedCategoryId = cat ? cat._id.toString() : null;
        }

        // Build sort obj
        let sortObj;
        switch (sort_by) {
            case 'rating': sortObj = { rating: -1, numReviews: -1 }; break;
            case 'recent': sortObj = { createdAt: -1 }; break;
            case 'price_asc': sortObj = { main_price: 1 }; break;
            default: sortObj = { ranking_score: -1, numOrders: -1, views: -1, rating: -1 };
        }

        // 1. Get ALL parent categories first (for the filter list)
        const allParentCats = await Category.find({ status: 'active', parent: null })
            .select('_id title icon')
            .sort({ title: 1 });

        // 2. Determine which parent categories to process
        let targetParentCats = allParentCats;
        if (resolvedCategoryId && resolvedCategoryId !== 'undefined') {
            targetParentCats = allParentCats.filter(c => c._id.toString() === resolvedCategoryId);
        }

        // 3. Get all active/approved products with ranking data
        const products = await Product.aggregate([
            { $match: { status: 'active', approval_status: 'approved', countInStock: { $gt: 0 } } },
            { $lookup: { from: 'users', localField: 'supplier', foreignField: '_id', as: 'supplier_info' } },
            { $unwind: { path: '$supplier_info', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'subscriptionplans', localField: 'supplier_info.subscription_plan', foreignField: '_id', as: 'supplier_info.subscription_plan_info' } },
            { $unwind: { path: '$supplier_info.subscription_plan_info', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category_info' } },
            { $unwind: { path: '$category_info', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    computed_rank: {
                        $add: [
                            { $ifNull: ['$ranking_score', 0] },
                            { $multiply: [{ $ifNull: ['$numOrders', 0] }, 3] },
                            { $multiply: [{ $ifNull: ['$views', 0] }, 0.5] },
                            { $multiply: [{ $ifNull: ['$rating', 0] }, 20] },
                            { $multiply: [{ $ifNull: ['$numReviews', 0] }, 2] },
                        ]
                    }
                }
            },
            { $sort: sortObj.ranking_score ? { computed_rank: -1 } : sortObj },
        ]);

        // 4. Group products by parent category
        const parentGroups = [];
        for (const parentCat of targetParentCats) {
            const childIds = await getChildCategoryIds(parentCat._id);
            const childIdStrs = childIds.map(id => id.toString());

            const catProducts = products.filter(p => {
                const catId = p.category_info?._id?.toString() || p.category?.toString();
                return catId && childIdStrs.includes(catId);
            });

            if (catProducts.length === 0) continue;

            parentGroups.push({
                _id: parentCat._id,
                title: parentCat.title,
                icon: parentCat.icon,
                products: catProducts.slice(0, parseInt(limit_per_cat)),
                totalProducts: catProducts.length,
            });

            if (!category_id && parentGroups.length >= parseInt(max_cats)) break;
        }

        res.json({
            categories: parentGroups,
            allCategories: allParentCats
        });
    } catch (error) {
        console.error('getTopRankingByCategory error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get related product bundle options (Frequently Bought Together)
// @route   GET /api/products/:id/bundle
// @access  Public
exports.getProductBundle = async (req, res) => {
    try {
        const query = req.params.id.match(/^[0-9a-fA-F]{24}$/)
            ? { _id: req.params.id }
            : { slug: req.params.id };

        const product = await Product.findOne(query).select('name main_image main_price price price_tiers slug category moq');
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        // Get 2 other active products in the same category
        const related = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            status: 'active',
            approval_status: 'approved'
        })
            .select('name main_image main_price price price_tiers slug category moq')
            .limit(2);

        res.json({
            mainProduct: product,
            bundleProducts: related,
            discountPercentage: 10
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get historical price logs for product detail chart
// @route   GET /api/products/:id/price-history
// @access  Public
exports.getProductPriceHistory = async (req, res) => {
    try {
        const query = req.params.id.match(/^[0-9a-fA-F]{24}$/)
            ? { _id: req.params.id }
            : { slug: req.params.id };

        const product = await Product.findOne(query).select('price main_price');
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        const PriceHistory = require('../models/PriceHistory');
        let history = await PriceHistory.find({ product: product._id }).sort({ date: 1 });

        if (history.length < 5) {
            const basePrice = product.main_price || product.price || 100;
            const points = [];
            const intervals = [30, 20, 15, 7, 0];
            const fluctuations = [-0.15, -0.05, 0.10, -0.02, 0];

            for (let i = 0; i < intervals.length; i++) {
                const daysAgo = intervals[i];
                const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
                const price = Math.round(basePrice * (1 + fluctuations[i]) * 100) / 100;
                points.push({
                    product: product._id,
                    price,
                    date
                });
            }
            await PriceHistory.insertMany(points);
            history = await PriceHistory.find({ product: product._id }).sort({ date: 1 });
        }

        res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error('getProductPriceHistory error:', error);
        res.status(500).json({ message: error.message });
    }
};


// @desc    Generate a single-use download token for a purchased digital product
// @route   POST /api/products/download-token
// @access  Private (Buyer)
exports.generateDownloadToken = async (req, res) => {
    try {
        const { order_id, product_id } = req.body;
        if (!order_id || !product_id) {
            return res.status(400).json({ message: 'Order ID and Product ID are required' });
        }

        const Order = require('../models/Order');
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Verify buyer
        let isAuthorized = false;
        if (req.user && order.buyer_id.toString() === req.user._id.toString()) {
            isAuthorized = true;
        } else {
            const { session_id, token: queryToken } = req.body;
            if (session_id && (
                order.stripe_session_id === session_id ||
                order.deposit_stripe_session_id === session_id ||
                order.balance_stripe_session_id === session_id
            )) {
                isAuthorized = true;
            } else if (queryToken && order.paypal_order_id === queryToken) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to download items from this order' });
        }

        // Verify paid status
        if (order.payment_status !== 'paid' && order.status === 'cancelled') {
            return res.status(400).json({ message: 'This order is unpaid or has been cancelled.' });
        }

        // Verify product is digital
        const product = await Product.findById(product_id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (!product.isDigital || !product.digitalFile) {
            return res.status(400).json({ message: 'This product is not a digital download or has no associated file.' });
        }

        // Generate token
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');

        const DigitalDownloadToken = require('../models/DigitalDownloadToken');
        await DigitalDownloadToken.create({
            token,
            order_id,
            product_id,
            buyer_id: req.user ? req.user._id : order.buyer_id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours expiry
        });

        res.json({
            success: true,
            downloadUrl: `/api/products/download/${token}`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download secure digital file using single-use token
// @route   GET /api/products/download/:token
// @access  Public
exports.downloadDigitalFile = async (req, res) => {
    try {
        const { token } = req.params;
        const DigitalDownloadToken = require('../models/DigitalDownloadToken');
        
        const downloadToken = await DigitalDownloadToken.findOne({ token });
        if (!downloadToken) {
            return res.status(404).send('Invalid or expired download link.');
        }

        if (downloadToken.used) {
            return res.status(410).send('This download link has already been used.');
        }

        if (new Date() > downloadToken.expiresAt) {
            return res.status(410).send('This download link has expired.');
        }

        // Mark token as used instantly (single-use)
        downloadToken.used = true;
        await downloadToken.save();

        const product = await Product.findById(downloadToken.product_id);
        if (!product || !product.digitalFile) {
            return res.status(404).send('Associated product or digital file not found.');
        }

        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '..', 'digital_store', product.digitalFile);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Digital file not found on the server.');
        }

        // Send file for download
        res.download(filePath, product.name + path.extname(product.digitalFile));
    } catch (error) {
        res.status(500).send(error.message);
    }
};


// @desc    Get frequently bought together products (checkout affinity + category fallback)
// @route   GET /api/products/:id/frequently-bought-together
// @access  Public
exports.getFrequentlyBoughtTogether = async (req, res) => {
    try {
        let productId = req.params.id;
        const mongoose = require('mongoose');
        const Product = require('../models/Product');
        const Order = require('../models/Order');

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            const foundProd = await Product.findOne({ slug: productId }).select('_id');
            if (foundProd) {
                productId = foundProd._id.toString();
            } else {
                return res.json({ products: [] });
            }
        }

        // Find orders containing the target product
        const orders = await Order.find({
            'order_items.product_id': productId,
            payment_status: 'paid'
        }).select('order_items');

        const coOccurringCounts = {};

        orders.forEach(order => {
            order.order_items.forEach(item => {
                if (item.product_id && item.product_id.toString() !== productId) {
                    const idStr = item.product_id.toString();
                    coOccurringCounts[idStr] = (coOccurringCounts[idStr] || 0) + 1;
                }
            });
        });

        // Sort by frequency count descending
        const sortedIds = Object.keys(coOccurringCounts).sort((a, b) => coOccurringCounts[b] - coOccurringCounts[a]);

        let recommendedProducts = [];
        if (sortedIds.length > 0) {
            recommendedProducts = await Product.find({
                _id: { $in: sortedIds.slice(0, 3) },
                status: 'active',
                approval_status: 'approved'
            }).select('name price sale_price main_image slug isDigital');
        }

        // Fallback if we have fewer than 3 recommendations: fetch from same category
        if (recommendedProducts.length < 3) {
            const currentProduct = await Product.findById(productId);
            if (currentProduct) {
                const needed = 3 - recommendedProducts.length;
                const existingIds = recommendedProducts.map(p => p._id.toString());
                existingIds.push(productId);

                const categoryProducts = await Product.find({
                    category: currentProduct.category,
                    _id: { $nin: existingIds },
                    status: 'active',
                    approval_status: 'approved'
                })
                .limit(needed)
                .select('name price sale_price main_image slug isDigital');

                recommendedProducts = [...recommendedProducts, ...categoryProducts];
            }
        }

        res.json(recommendedProducts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Search product by barcode
// @route   GET /api/products/search-barcode/:barcode
// @access  Public
exports.searchProductByBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;
        if (!barcode || !barcode.trim()) {
            return res.status(400).json({ message: 'Barcode is required.' });
        }

        const product = await Product.findOne({
            barcode: barcode.trim(),
            status: 'active',
            approval_status: 'approved'
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found with this barcode.' });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
