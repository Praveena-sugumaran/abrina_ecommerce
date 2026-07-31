const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get buyer's wishlist
// @route   GET /api/wishlist
// @access  Private/Buyer
exports.getWishlist = async (req, res) => {
    try {
        const wishlistItems = await Wishlist.find({ buyer_id: req.user._id })
            .populate({
                path: 'product_id',
                select: 'name main_price images main_image moq rating countInStock'
            })
            .sort({ created_at: -1 });

        // Format to return just the products with wishlist meta
        const formatted = wishlistItems.map(item => ({
            _id: item._id, // wishlist entry id
            product: item.product_id,
            added_at: item.created_at
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add product to wishlist
// @route   POST /api/wishlist/:productId
// @access  Private/Buyer
exports.addToWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        // Verify product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if already in wishlist
        const exists = await Wishlist.findOne({
            buyer_id: req.user._id,
            product_id: productId
        });

        if (exists) {
            return res.status(400).json({ message: 'Product is already in your wishlist' });
        }

        const wishlistItem = await Wishlist.create({
            buyer_id: req.user._id,
            product_id: productId
        });
        
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { wishlist: productId } });

        res.status(201).json(wishlistItem);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Product is already in your wishlist' });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private/Buyer
exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        const wishlistItem = await Wishlist.findOneAndDelete({
            buyer_id: req.user._id,
            product_id: productId
        });

        if (!wishlistItem) {
            return res.status(404).json({ message: 'Product not found in wishlist' });
        }
        
        await User.findByIdAndUpdate(req.user._id, { $pull: { wishlist: productId } });

        res.json({ message: 'Removed from wishlist successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check if product is in wishlist
// @route   GET /api/wishlist/check/:productId
// @access  Private/Buyer
exports.checkWishlist = async (req, res) => {
    try {
        const exists = await Wishlist.findOne({
            buyer_id: req.user._id,
            product_id: req.params.productId
        });

        res.json({ inWishlist: !!exists });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle product in wishlist
// @route   POST /api/wishlist/toggle/:productId
// @access  Private/Buyer
exports.toggleWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        // Check if already in wishlist
        const exists = await Wishlist.findOne({
            buyer_id: req.user._id,
            product_id: productId
        });

        if (exists) {
            await Wishlist.findByIdAndDelete(exists._id);
            await User.findByIdAndUpdate(req.user._id, { $pull: { wishlist: productId } });
            return res.json({ isLiked: false, message: 'Removed from wishlist' });
        } else {
            await Wishlist.create({
                buyer_id: req.user._id,
                product_id: productId
            });
            await User.findByIdAndUpdate(req.user._id, { $addToSet: { wishlist: productId } });
            return res.json({ isLiked: true, message: 'Added to wishlist' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
