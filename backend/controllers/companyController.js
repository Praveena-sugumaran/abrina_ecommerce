const Company = require('../models/Company');
const Product = require('../models/Product');

// Get company profile for logged in user (Buyer or Supplier)
const getCompanyProfile = async (req, res) => {
    try {
        const company = await Company.findOne({ user_id: req.user._id });
        if (!company) {
            return res.status(404).json({ message: 'Company profile not found' });
        }
        res.json(company);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching company profile', error: error.message });
    }
};

// Get public profile by supplier user ID
const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;
        const User = require('../models/User'); // Import User model to fetch username/etc
        const user = await User.findById(id).select('-password').populate({
            path: 'subscription_plan',
            select: 'name level badge_color has_verified_badge'
        });

        if (!user) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        const company = await Company.findOne({ user_id: id });

        res.json({
            user: user,
            company: company || {}
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching company by ID', error: error.message });
    }
};

// Create or update company profile
const upsertCompanyProfile = async (req, res) => {
    try {
        const {
            company_name,
            business_type,
            country,
            city,
            state,
            address,
            website,
            phone,
            mobile,
            fax,
            description,
            staff_size,
            factory_area,
            annual_revenue,
            capabilities,
            certifications,
            tax_id,
            id_proof,
            phone_country,
            mobile_country,
            split_payment_enabled,
            email
        } = req.body;
 
        // Clean phone and mobile numbers
        const cleanedPhone = phone ? phone.toString().replace(/\D/g, '') : '';
        const cleanedMobile = mobile ? mobile.toString().replace(/\D/g, '') : '';
 
        // Fetch dynamic country validation from DB
        const Country = require('../models/Country');
        const countryDoc = await Country.findOne({ name: country });
        
        if (countryDoc) {
            const expectedLen = countryDoc.phone_length || 10;
            
            if (cleanedPhone && cleanedPhone.length !== expectedLen) {
                return res.status(400).json({ message: `Phone number for ${country} must be ${expectedLen} digits` });
            }
            if (cleanedMobile && cleanedMobile.length !== expectedLen) {
                return res.status(400).json({ message: `Mobile number for ${country} must be ${expectedLen} digits` });
            }
        }
 
        const companyFields = {
            user_id: req.user._id,
            company_name,
            business_type,
            country: country ? country.trim().charAt(0).toUpperCase() + country.trim().slice(1).toLowerCase() : '',
            city: city || '',
            state: state || '',
            address: address || '',
            website: website || '',
            phone: cleanedPhone,
            phone_country: phone_country || '',
            mobile: cleanedMobile,
            mobile_country: mobile_country || '',
            email: email || '',
            fax: fax || '',
            description: description || '',
            staff_size: staff_size || '',
            factory_area: factory_area || '',
            annual_revenue: annual_revenue || '',
            capabilities: Array.isArray(capabilities) ? capabilities : (capabilities ? capabilities.split(',').map(s => s.trim()) : []),
            certifications: Array.isArray(certifications) ? certifications : (certifications ? certifications.split(',').map(s => s.trim()) : []),
            tax_id: tax_id || '',
            id_proof: id_proof || '',
            split_payment_enabled: split_payment_enabled === 'true' || split_payment_enabled === true
        };

        // Check if company exists for this user
        let company = await Company.findOne({ user_id: req.user._id });


        // Handle File Uploads - ONLY add if files exist, do not overwrite if missing
        if (req.files) {
            if (req.files['logo'] && req.files['logo'].length > 0) {
                companyFields.logo = '/uploads/' + req.files['logo'][0].filename;
            }
            if (req.files['document'] && req.files['document'].length > 0) {
                companyFields.document = '/uploads/' + req.files['document'][0].filename;
            }
            if (req.files['banner_image'] && req.files['banner_image'].length > 0) {
                companyFields.banner_image = '/uploads/' + req.files['banner_image'][0].filename;
            }
            if (req.files['video'] && req.files['video'].length > 0) {
                companyFields.video = '/uploads/' + req.files['video'][0].filename;
            }
        }

        if (company) {
            // Update existing company
            company = await Company.findOneAndUpdate(
                { user_id: req.user._id },
                { $set: companyFields },
                { new: true, runValidators: true }
            );
        } else {
            // Create new company
            company = new Company(companyFields);
            await company.save();
        }

        // 🔔 Notify Admins about Verification Request
        try {
            const { sendNotification } = require('../services/notificationService');
            const User = require('../models/User');
            const admins = await User.find({ role: 'admin' });
            for (const admin of admins) {
                await sendNotification(
                    req.io,
                    admin._id,
                    'Business Verification Needed',
                    `${company.company_name} has updated their profile and requires verification.`,
                    'admin',
                    '/admin/dashboard' // Link to dashboard where verifications are managed
                );
            }
        } catch (notifErr) {
            console.error('Admin verification notification error:', notifErr);
        }

        res.json(company);

    } catch (error) {
        console.error('upsertCompanyProfile error:', error);
        res.status(500).json({ message: 'Server error saving company profile', error: error.message });
    }
};
// Search companies by keyword
const searchCompanies = async (req, res) => {
    try {
        const { keyword, verified_only, verified_pro, country, certifications, capabilities, rating_min, page = 1, limit = 12 } = req.query;
        let query = {};

        if (keyword) {
            // Find products matching keyword to get their supplier IDs
            const productSuppliers = await Product.find({
                $or: [
                    { name: { $regex: keyword, $options: 'i' } },
                    { description: { $regex: keyword, $options: 'i' } }
                ],
                status: 'active'
            }).distinct('supplier');

            query.$or = [
                { company_name: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } },
                { business_type: { $regex: keyword, $options: 'i' } },
                { user_id: { $in: productSuppliers } }
            ];
        }
        if (verified_only === 'true') {
            query.verification_status = 'verified';
        }
        if (country) {
            query.country = { $regex: country, $options: 'i' };
        }
        if (certifications) {
            const certs = certifications.split(',').map(s => s.trim());
            query.certifications = { $all: certs };
        }
        if (capabilities) {
            const caps = capabilities.split(',').map(s => s.trim());
            query.capabilities = { $in: caps };
        }

        let aggregate = [
            { $match: query },
            // Join user
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            // Join subscription plan to get 'level' and 'has_verified_badge'
            {
                $lookup: {
                    from: 'subscriptionplans',
                    localField: 'user.subscription_plan',
                    foreignField: '_id',
                    as: 'plan'
                }
            },
            { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
            // Filter by verified_pro if requested
            ...(verified_pro === 'true' ? [{ $match: { 'plan.has_verified_badge': true } }] : []),
            // Join reviews to calculate average rating
            {
                $lookup: {
                    from: 'reviews',
                    localField: 'user_id',
                    foreignField: 'supplier_id',
                    as: 'reviews'
                }
            },
            {
                $addFields: {
                    avgRating: { $ifNull: [{ $avg: '$reviews.rating' }, 0] },
                    reviewCount: { $size: '$reviews' }
                }
            },
            // Filter by rating_min if requested
            ...(rating_min ? [{ $match: { avgRating: { $gte: parseFloat(rating_min) } } }] : []),
            // Add a default level 0 if no plan exists
            {
                $addFields: {
                    planLevel: { $ifNull: ['$plan.level', 0] }
                }
            },
            // SORT BY: Level (High to Low), then Rating, then Recency
            { $sort: { planLevel: -1, avgRating: -1, createdAt: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        ];

        let companies = await Company.aggregate(aggregate);

        // Map back to the expected structure for frontend (renaming 'user' and 'plan' properly)
        companies = companies.map(c => ({
            ...c,
            user_id: {
                ...c.user,
                subscription_plan: c.plan
            }
        }));

        // Fetch top 3 products for each company
        const companyUserIds = companies.map(c => c.user_id._id || c.user_id);
        const productsList = await Product.find({
            supplier: { $in: companyUserIds },
            status: 'active'
        }).lean();

        // Group products by supplier
        const productsBySupplier = {};
        productsList.forEach(p => {
            const sid = p.supplier.toString();
            if (!productsBySupplier[sid]) {
                productsBySupplier[sid] = [];
            }
            productsBySupplier[sid].push(p);
        });

        // Attach top products and calculated fields to each company
        companies = companies.map(c => {
            const sid = c.user_id._id ? c.user_id._id.toString() : c.user_id.toString();
            const allProducts = productsBySupplier[sid] || [];
            const topProducts = allProducts.slice(0, 4);

            let years_experience = 0;
            const createdDate = c.createdAt || (c.user_id && c.user_id.createdAt);
            if (createdDate) {
                const diffTime = Math.abs(new Date() - new Date(createdDate));
                years_experience = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
            }

            return {
                ...c,
                products: topProducts,
                products_count: allProducts.length,
                years_experience: years_experience
            };
        });

        const count = await Company.countDocuments(query);

        res.json({
            companies,
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error searching companies', error: error.message });
    }
};

const getCompanyLocations = async (req, res) => {
    try {
        const locations = await Company.distinct('country');
        
        // Normalize to Title Case and filter junk
        const normalized = locations
            .filter(l => l && l.trim().length >= 2 && !/^\d+$/.test(l)) // Exclude empty, too short, or only numbers
            .map(l => {
                const trimmed = l.trim();
                return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
            });

        // Deduplicate and sort
        const unique = Array.from(new Set(normalized)).sort();
        
        res.json(unique);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching company locations', error: error.message });
    }
};

const toggleFollowCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Check if already following
        const isFollowing = company.followers && company.followers.includes(req.user._id);

        if (isFollowing) {
            // Unfollow
            company.followers = company.followers.filter(f => f.toString() !== req.user._id.toString());
        } else {
            // Follow
            if (!company.followers) {
                company.followers = [];
            }
            company.followers.push(req.user._id);
        }

        await company.save();

        res.json({
            success: true,
            isFollowing: !isFollowing,
            followerCount: company.followers ? company.followers.length : 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error toggling follow status', error: error.message });
    }
};

const getFollowStatus = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        let userId = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch (err) {
                // Ignore invalid token, treat as guest
            }
        }

        const isFollowing = userId ? (company.followers && company.followers.includes(userId)) : false;
        const followerCount = company.followers ? company.followers.length : 0;

        res.json({
            isFollowing,
            followerCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error checking follow status', error: error.message });
    }
};

module.exports = {
    getCompanyProfile,
    upsertCompanyProfile,
    getCompanyById,
    searchCompanies,
    getCompanyLocations,
    toggleFollowCompany,
    getFollowStatus
};
