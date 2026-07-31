const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Internal helper for coupon validation
const validateCoupon = async (code, items = [], userId) => {
    if (!code) return { isValid: false, message: 'Coupon code is required' };

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) return { isValid: false, message: 'Invalid coupon code' };

    if (!coupon.is_active) return { isValid: false, message: 'Coupon is inactive' };

    const now = new Date();
    if (now < coupon.start_date) return { isValid: false, message: 'Coupon is not yet active' };
    if (now > coupon.end_date) return { isValid: false, message: 'Coupon has expired' };

    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
        return { isValid: false, message: 'Coupon usage limit reached' };
    }

    // Check user usage limit
    if (userId) {
        const orderCount = await Order.countDocuments({
            buyer_id: userId,
            coupon_code: coupon.code,
            payment_status: 'paid'
        });
        if (orderCount >= coupon.user_usage_limit) {
            return { isValid: false, message: 'You have already used this coupon' };
        }
    }

    // Determine subtotal for validation
    let validSubtotal = 0;
    
    // Group and validate products in items
    for (const item of items) {
        const product = await Product.findById(item.productId || item.product_id);
        if (!product) continue;

        // If coupon is supplier-specific, only count items from that supplier
        if (coupon.supplier) {
            if (product.supplier.toString() === coupon.supplier.toString()) {
                // Calculate item price (falls back to main_price if not set on the item)
                const price = item.price || product.main_price;
                validSubtotal += price * item.quantity;
            }
        } else {
            // Global coupon counts all items
            const price = item.price || product.main_price;
            validSubtotal += price * item.quantity;
        }
    }

    if (validSubtotal === 0) {
        return { 
            isValid: false, 
            message: coupon.supplier 
                ? 'Coupon is not applicable to any products in your cart' 
                : 'No valid products found in cart' 
        };
    }

    if (validSubtotal < coupon.min_order_amount) {
        return { 
            isValid: false, 
            message: `Minimum order subtotal of $${coupon.min_order_amount} required to use this coupon` 
        };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
        discountAmount = (validSubtotal * coupon.discount_value) / 100;
        if (coupon.max_discount_amount !== null && discountAmount > coupon.max_discount_amount) {
            discountAmount = coupon.max_discount_amount;
        }
    } else if (coupon.discount_type === 'fixed') {
        discountAmount = coupon.discount_value;
    }

    // Cap the discount at the subtotal amount
    if (discountAmount > validSubtotal) {
        discountAmount = validSubtotal;
    }

    return {
        isValid: true,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        coupon
    };
};

// @desc    Create a Coupon
// @route   POST /api/coupons
// @access  Private (Admin / Supplier)
exports.createCoupon = async (req, res) => {
    try {
        const {
            code,
            discount_type,
            discount_value,
            min_order_amount,
            max_discount_amount,
            start_date,
            end_date,
            usage_limit,
            user_usage_limit
        } = req.body;

        const isSupplier = req.user.roles?.includes('supplier') || req.user.role === 'supplier';
        const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';

        if (!isAdmin && !isSupplier) {
            return res.status(403).json({ message: 'Access denied: Unauthorized role' });
        }

        // Code uniqueness check
        const cleanCode = code.toUpperCase().trim();
        const existingCoupon = await Coupon.findOne({ code: cleanCode });
        if (existingCoupon) {
            return res.status(400).json({ message: 'A coupon with this code already exists' });
        }

        const couponData = {
            code: cleanCode,
            discount_type,
            discount_value: Number(discount_value),
            min_order_amount: Number(min_order_amount || 0),
            max_discount_amount: max_discount_amount ? Number(max_discount_amount) : null,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            usage_limit: usage_limit ? Number(usage_limit) : null,
            user_usage_limit: user_usage_limit ? Number(user_usage_limit) : 1,
            supplier: isSupplier ? req.user._id : null // admin creates global coupons by default
        };

        const coupon = await Coupon.create(couponData);
        res.status(201).json(coupon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all Coupons
// @route   GET /api/coupons
// @access  Private (Admin / Supplier)
exports.getCoupons = async (req, res) => {
    try {
        const isSupplier = req.user.roles?.includes('supplier') || req.user.role === 'supplier';
        const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';

        if (!isAdmin && !isSupplier) {
            return res.status(403).json({ message: 'Access denied' });
        }

        let query = {};
        if (isSupplier) {
            query.supplier = req.user._id;
        }

        const coupons = await Coupon.find(query).sort({ createdAt: -1 });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Validate Promo Code
// @route   POST /api/coupons/validate
// @access  Private
exports.validateCoupon = async (req, res) => {
    try {
        const { code, items } = req.body;
        const validation = await validateCoupon(code, items, req.user._id);

        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        res.json({
            code: validation.coupon.code,
            discount_type: validation.coupon.discount_type,
            discount_value: validation.coupon.discount_value,
            discount_amount: validation.discountAmount,
            supplier: validation.coupon.supplier
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a Coupon
// @route   PUT /api/coupons/:id
// @access  Private (Admin / Supplier)
exports.updateCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        const isSupplier = req.user.roles?.includes('supplier') || req.user.role === 'supplier';
        const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';

        if (!isAdmin && !isSupplier) {
            return res.status(403).json({ message: 'Access denied: Unauthorized role' });
        }

        if (isSupplier && coupon.supplier?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized to edit this coupon' });
        }

        const {
            code,
            discount_type,
            discount_value,
            min_order_amount,
            max_discount_amount,
            start_date,
            end_date,
            usage_limit,
            user_usage_limit,
            is_active
        } = req.body;

        if (code) {
            const cleanCode = code.toUpperCase().trim();
            const existingCoupon = await Coupon.findOne({ code: cleanCode, _id: { $ne: req.params.id } });
            if (existingCoupon) {
                return res.status(400).json({ message: 'A coupon with this code already exists' });
            }
            coupon.code = cleanCode;
        }

        if (discount_type !== undefined) coupon.discount_type = discount_type;
        if (discount_value !== undefined) coupon.discount_value = Number(discount_value);
        if (min_order_amount !== undefined) coupon.min_order_amount = Number(min_order_amount);
        if (max_discount_amount !== undefined) coupon.max_discount_amount = max_discount_amount ? Number(max_discount_amount) : null;
        if (start_date) coupon.start_date = new Date(start_date);
        if (end_date) coupon.end_date = new Date(end_date);
        if (usage_limit !== undefined) coupon.usage_limit = usage_limit ? Number(usage_limit) : null;
        if (user_usage_limit !== undefined) coupon.user_usage_limit = Number(user_usage_limit);
        if (is_active !== undefined) coupon.is_active = !!is_active;

        const updatedCoupon = await coupon.save();
        res.json(updatedCoupon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Coupon
// @route   DELETE /api/coupons/:id
// @access  Private (Admin / Supplier)
exports.deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        const isSupplier = req.user.roles?.includes('supplier') || req.user.role === 'supplier';
        const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';

        if (isSupplier && coupon.supplier?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized to delete this coupon' });
        }

        await Coupon.findByIdAndDelete(req.params.id);
        res.json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Export the internal validation helper for use in orderController.js
exports.validateCouponInternal = validateCoupon;

// @desc    Get applicable coupons for a buyer's cart
// @route   POST /api/coupons/applicable
// @access  Private
exports.getApplicableCoupons = async (req, res) => {
    try {
        const { items } = req.body;
        const now = new Date();

        // 1. Get all active coupons within date range
        let query = {
            is_active: true,
            start_date: { $lte: now },
            end_date: { $gte: now }
        };

        const coupons = await Coupon.find(query).sort({ createdAt: -1 });

        // 2. Extract unique suppliers from cart items
        const supplierIdsInCart = [];
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const product = await Product.findById(item.productId || item.product_id);
                if (product && product.supplier) {
                    supplierIdsInCart.push(product.supplier.toString());
                }
            }
        }
        const uniqueSuppliers = [...new Set(supplierIdsInCart)];

        // 3. Filter coupons to return global or matching supplier ones
        const applicableCoupons = coupons.filter(coupon => {
            if (!coupon.supplier) return true; // Global coupons are always applicable
            return uniqueSuppliers.includes(coupon.supplier.toString());
        });

        res.json(applicableCoupons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get public active coupons
// @route   GET /api/coupons/public
// @access  Public
exports.getPublicCoupons = async (req, res) => {
    try {
        const { supplier } = req.query;
        const now = new Date();

        // Auto-refresh dates for demo coupons to prevent them from disappearing
        const demoCodes = ["WELCOME5", "FLASH50", "PREMIASAVE"];
        
        // Ensure demo coupons exist in the database
        const existingDemo = await Coupon.find({ code: { $in: demoCodes } });
        if (existingDemo.length < demoCodes.length) {
            const newStartDate = new Date();
            newStartDate.setDate(newStartDate.getDate() - 1);
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + 30);

            const missingCodes = demoCodes.filter(code => !existingDemo.some(c => c.code === code));
            
            for (const code of missingCodes) {
                let discount_type = 'percentage';
                let discount_value = 10;
                let min_order_amount = 50;
                
                if (code === "WELCOME5") {
                    discount_type = 'fixed';
                    discount_value = 5;
                    min_order_amount = 20;
                } else if (code === "FLASH50") {
                    discount_type = 'percentage';
                    discount_value = 50;
                    min_order_amount = 200;
                } else if (code === "PREMIASAVE") {
                    discount_type = 'percentage';
                    discount_value = 15;
                    min_order_amount = 100;
                }

                await Coupon.create({
                    code,
                    discount_type,
                    discount_value,
                    min_order_amount,
                    start_date: newStartDate,
                    end_date: newEndDate,
                    is_active: true,
                    usage_limit: null,
                    user_usage_limit: 5,
                    supplier: null
                });
            }
        }

        const expiredDemoCoupons = await Coupon.find({
            code: { $in: demoCodes },
            end_date: { $lt: now }
        });
        if (expiredDemoCoupons.length > 0) {
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + 30);
            const newStartDate = new Date();
            newStartDate.setDate(newStartDate.getDate() - 1);
            for (const coupon of expiredDemoCoupons) {
                coupon.start_date = newStartDate;
                coupon.end_date = newEndDate;
                await coupon.save();
            }
        }

        let query = {
            is_active: true,
            start_date: { $lte: now },
            end_date: { $gte: now }
        };

        // If usage limit is set, only show coupons where used_count < usage_limit
        query.$expr = {
            $or: [
                { $eq: ["$usage_limit", null] },
                { $lt: ["$used_count", "$usage_limit"] }
            ]
        };

        if (supplier) {
            query.$or = [
                { supplier: null },
                { supplier: supplier }
            ];
        }

        const coupons = await Coupon.find(query)
            .populate('supplier', 'first_name last_name company_name')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

