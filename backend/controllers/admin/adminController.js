const Product = require('../../models/Product');
const User = require('../../models/User');
const Category = require('../../models/Category');
const Company = require('../../models/Company');
const Order = require('../../models/Order');
const auditService = require('../../services/auditService');

exports.getAdminStats = async (req, res) => {
    try {
        const now = new Date();
        const [usersCount, buyerCount, supplierCount, adminCount] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ roles: 'buyer' }),
            User.countDocuments({ roles: 'supplier' }),
            User.countDocuments({ roles: 'admin' })
        ]);

        const [productsCount, categoriesCount, companiesCount, pendingCompaniesCount, totalOrdersCount] = await Promise.all([
            Product.countDocuments(),
            Category.countDocuments(),
            Company.countDocuments(),
            Company.countDocuments({ verification_status: 'pending' }),
            Order.countDocuments()
        ]);

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayUserCount = await User.countDocuments({ createdAt: { $gte: startOfToday } });
        const todayBuyerCount = await User.countDocuments({ roles: 'buyer', createdAt: { $gte: startOfToday } });
        const todaySupplierCount = await User.countDocuments({ roles: 'supplier', createdAt: { $gte: startOfToday } });
        const todayProductCount = await Product.countDocuments({ createdAt: { $gte: startOfToday } });
        const todayOrderStats = await Order.aggregate([
            { $match: { payment_status: 'paid', createdAt: { $gte: startOfToday } } },
            { 
                $group: { 
                    _id: null, 
                    count: { $sum: 1 }, 
                    earnings: { $sum: "$total_amount" } 
                } 
            }
        ]);
        const todayOrderCount = todayOrderStats[0]?.count || 0;
        const todayEarnings = todayOrderStats[0]?.earnings || 0;

        const financialStats = await Order.aggregate([
            { $match: { payment_status: 'paid' } },
            {
                $group: {
                    _id: null,
                    totalVolume: { $sum: "$total_amount" },
                    transactionFees: { $sum: "$service_fee" }
                }
            }
        ]);

        const totalVolume = financialStats[0]?.totalVolume || 0;
        const transactionFees = financialStats[0]?.transactionFees || 0;

        const boostedRFQsCount = 0;
        const adRevenueFromBoosts = boostedRFQsCount * 10;

        const promotedProducts = await Product.find({ isPromoted: true });
        const adRevenueFromPPC = promotedProducts.reduce((sum, p) => sum + (p.ppc_bid || 0) * 100, 0);
        const totalAdRevenue = adRevenueFromBoosts + adRevenueFromPPC;

        const subscriptionStats = await User.aggregate([
            { $match: { subscription_plan: { $ne: null } } },
            {
                $lookup: {
                    from: 'subscriptionplans',
                    localField: 'subscription_plan',
                    foreignField: '_id',
                    as: 'plan'
                }
            },
            { $unwind: '$plan' },
            { $group: { _id: null, total: { $sum: '$plan.price' } } }
        ]);
        const subscriptionRevenue = subscriptionStats[0]?.total || 0;

        const totalPlatformRevenue = transactionFees + totalAdRevenue + subscriptionRevenue;

        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthStats = await Order.aggregate([
            { $match: { payment_status: 'paid', createdAt: { $gte: firstDayOfMonth } } },
            {
                $group: {
                    _id: null,
                    volume: { $sum: "$total_amount" },
                    fees: { $sum: "$service_fee" }
                }
            }
        ]);

        const currentMonthVolume = thisMonthStats[0]?.volume || 0;

        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const monthlyAggregation = await Order.aggregate([
            {
                $match: {
                    payment_status: 'paid',
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    monthlyVolume: { $sum: "$total_amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const months = [];
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString('default', { month: 'short' });
            const year = d.getFullYear();
            const monthVal = d.getMonth() + 1;

            months.push(monthName);

            const match = monthlyAggregation.find(a => a._id.year === year && a._id.month === monthVal);
            monthlyData.push(match ? Math.round(match.monthlyVolume) : 0);
        }

        res.json({
            buyerCount,
            supplierCount,
            adminCount,
            products: productsCount,
            categories: categoriesCount,
            pendingCompanies: pendingCompaniesCount,
            totalEarnings: totalVolume,
            adminEarnings: totalPlatformRevenue,
            monthlyEarnings: currentMonthVolume,
            monetization: {
                transactionFees: parseFloat(transactionFees.toFixed(2)),
                adRevenue: parseFloat(totalAdRevenue.toFixed(2)),
                subscriptionRevenue: parseFloat(subscriptionRevenue.toFixed(2)),
                totalVolume: parseFloat(totalVolume.toFixed(2))
            },
            monthlyRevenue: {
                labels: months,
                data: monthlyData
            },
            userDistribution: [buyerCount, supplierCount, adminCount],
            totalUsers: usersCount,
            totalOrders: totalOrdersCount,
            todayUserCount,
            todayBuyerCount,
            todaySupplierCount,
            todayProductCount,
            todayOrderCount,
            todayEarnings
        });
    } catch (err) {
        console.error('getAdminStats error:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.getAdminProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate('supplier', 'first_name last_name company_name')
            .populate('category', 'title')
            .sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.approveProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                approval_status: 'approved',
                status: 'active',
                approval_note: ''
            },
            { new: true }
        );

        if (product) {
            const Notification = require('../../models/Notification');
            await Notification.create({
                userId: product.supplier,
                title: 'Product Approved',
                message: `Your product "${product.name}" has been approved.`,
                role: 'supplier',
                link: '/supplier/products'
            });
            await auditService.logAction(req, 'APPROVE_PRODUCT', 'PRODUCT', 'success', { productId: product._id, name: product.name });

            const { enqueueTemplatedMail } = require('../../services/mailService');
            const supplier = await User.findById(product.supplier);
            if (supplier && supplier.email) {
                enqueueTemplatedMail('product-approved', supplier.email, {
                    product_name: product.name,
                    product_url: `${process.env.FRONTEND_URL}/product/${product._id}`
                }).catch(e => console.error('Product approval email error:', e));
            }
        }

        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.rejectProduct = async (req, res) => {
    try {
        const { note } = req.body;
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                approval_status: 'rejected',
                status: 'inactive',
                approval_note: note
            },
            { new: true }
        );

        if (product) {
            const Notification = require('../../models/Notification');
            await Notification.create({
                userId: product.supplier,
                title: 'Product Rejected',
                message: `Your product "${product.name}" was rejected. Reason: ${note}`,
                role: 'supplier',
                link: '/supplier/products'
            });
            await auditService.logAction(req, 'REJECT_PRODUCT', 'PRODUCT', 'success', { productId: product._id, name: product.name, note });

            const { enqueueTemplatedMail } = require('../../services/mailService');
            const supplier = await User.findById(product.supplier);
            if (supplier && supplier.email) {
                enqueueTemplatedMail('product-rejected', supplier.email, {
                    product_name: product.name,
                    reason: note || 'Missing information or policy violation',
                    edit_url: `${process.env.FRONTEND_URL}/supplier/products/edit/${product._id}`
                }).catch(e => console.error('Product rejection email error:', e));
            }
        }

        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        await product.deleteOne();
        await auditService.logAction(req, 'DELETE_PRODUCT', 'PRODUCT', 'success', { productId: product._id, name: product.name });

        res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAdminCompanies = async (req, res) => {
    try {
        const companies = await Company.find()
            .populate('user_id', 'first_name last_name email role status payout_methods')
            .sort({ createdAt: -1 });
        res.json(companies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.verifyCompany = async (req, res) => {
    try {
        const { status, note } = req.body;
        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const company = await Company.findById(req.params.id);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        company.verification_status = status;
        company.rejection_reason = status === 'rejected' ? (note || 'Incomplete documents or mismatched information') : '';
        await company.save();

        const Notification = require('../../models/Notification');

        if (status === 'verified') {
            await User.findByIdAndUpdate(company.user_id, {
                is_verified: true,
                status: 'verified'
            });

            await Notification.create({
                userId: company.user_id,
                title: '✅ Supplier Verification Approved',
                message: `Congratulations! Your company profile for "${company.company_name}" has been verified. You now have full access to supplier features.`,
                role: 'supplier',
                link: '/supplier/dashboard'
            });

            const { enqueueTemplatedMail } = require('../../services/mailService');
            const user = await User.findById(company.user_id);
            if (user && user.email) {
                enqueueTemplatedMail('company-verification-approved', user.email, {
                    first_name: user.first_name,
                    company_name: company.company_name,
                    login_url: `${process.env.FRONTEND_URL}/login`
                }).catch(e => console.error('Verification approved email error:', e));
            }
        } else {
            await User.findByIdAndUpdate(company.user_id, {
                is_verified: false,
                status: 'active'
            });

            await Notification.create({
                userId: company.user_id,
                title: '❌ Supplier Verification Rejected',
                message: `Your company profile for "${company.company_name}" was not approved. ${note ? `Reason: ${note}` : 'Please review your documents and try again.'}`,
                role: 'supplier'
            });

            const { enqueueTemplatedMail } = require('../../services/mailService');
            const user = await User.findById(company.user_id);
            if (user && user.email) {
                enqueueTemplatedMail('company-verification-rejected', user.email, {
                    first_name: user.first_name,
                    company_name: company.company_name,
                    reason: note || 'Incomplete documents or mismatched information',
                    resubmit_url: `${process.env.FRONTEND_URL}/supplier/register`
                }).catch(e => console.error('Verification rejected email error:', e));
            }
        }

        res.json({ success: true, company });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.addFactoryAudit = async (req, res) => {
    try {
        const { audit_date, auditor_name, audit_report_url, status } = req.body;
        const company = await Company.findById(req.params.id);

        if (!company) return res.status(404).json({ message: 'Company not found' });

        company.factory_audits.push({
            audit_date,
            auditor_name,
            audit_report_url,
            status: status || 'pending'
        });

        await company.save();

        const Notification = require('../../models/Notification');
        await Notification.create({
            userId: company.user_id,
            title: 'Factory Audit Scheduled/Updated',
            message: `An audit for your factory has been ${status === 'passed' ? 'successfully completed' : 'updated'}.`,
            link: '/supplier/dashboard'
        });

        res.json({ success: true, audits: company.factory_audits });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getRiskAlerts = async (req, res) => {
    try {
        const RiskAlert = require('../../models/RiskAlert');
        const alerts = await RiskAlert.find()
            .populate('userId', 'email first_name last_name role')
            .sort({ createdAt: -1 });
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getSupplierPayouts = async (req, res) => {
    try {
        const users = await User.find({ roles: 'supplier' }, 'first_name last_name email company_name payout_methods wallet_balance');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAdminSupplierProfile = async (req, res) => {
    try {
        const { id } = req.params;
        let user = await User.findById(id).select('-password');
        let company = null;

        if (user) {
            company = await Company.findOne({ user_id: user._id });
        } else {
            company = await Company.findById(id);
            if (company && company.user_id) {
                user = await User.findById(company.user_id).select('-password');
            }
        }

        if (!user && !company) {
            return res.status(404).json({ message: 'Supplier profile not found' });
        }

        const userId = user ? user._id : company?.user_id;

        const products = userId
            ? await Product.find({ supplier: userId }).sort({ createdAt: -1 })
            : [];

        const totalOrders = userId
            ? await Order.countDocuments({ "items.seller_id": userId })
            : 0;

        const orderVolumeStats = userId
            ? await Order.aggregate([
                { $match: { "items.seller_id": userId, payment_status: 'paid' } },
                { $group: { _id: null, total: { $sum: "$total_amount" } } }
            ])
            : [];

        const totalRevenue = orderVolumeStats[0]?.total || 0;

        res.json({
            user,
            company,
            products,
            stats: {
                totalProducts: products.length,
                activeProducts: products.filter(p => p.status === 'active' || p.approval_status === 'approved').length,
                pendingProducts: products.filter(p => p.approval_status === 'pending').length,
                totalOrders,
                totalRevenue
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
