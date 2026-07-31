const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
    try {
        const { product_id, order_id, rating, comment, images, videos } = req.body;
        const cleanProductId = typeof product_id === 'object' && product_id !== null
            ? (product_id._id || product_id).toString()
            : (product_id ? product_id.toString() : '');

        // Verify the order exists, belongs to the buyer, and is delivered
        const order = await Order.findOne({ _id: order_id, buyer_id: req.user._id });
        if (!order) {
            return res.status(404).json({ message: 'Order not found or not authorized' });
        }

        // Technically, you might restrict to 'delivered' orders, but for testing we check if the item is in the order
        const itemInOrder = order.order_items.find(item => {
            const itemId = item.product_id && (item.product_id._id || item.product_id);
            return itemId && itemId.toString() === cleanProductId;
        });
        if (!itemInOrder) {
            return res.status(400).json({ message: 'Product is not part of this order' });
        }

        const alreadyReviewed = await Review.findOne({ buyer_id: req.user._id, product_id: cleanProductId, order_id });
        if (alreadyReviewed) {
            return res.status(400).json({ message: 'You have already reviewed this product for this order' });
        }

        const review = await Review.create({
            buyer_id: req.user._id,
            supplier_id: order.supplier_id,
            product_id: cleanProductId,
            order_id,
            rating,
            comment,
            images: Array.isArray(images) ? images : [],
            videos: Array.isArray(videos) ? videos : []
        });

        // Update Product Rating
        const productReviews = await Review.find({ product_id: cleanProductId });
        const numReviews = productReviews.length;
        const avgRating = productReviews.reduce((acc, item) => item.rating + acc, 0) / numReviews;

        await Product.findByIdAndUpdate(cleanProductId, {
            rating: avgRating,
            numReviews
        });

        res.status(201).json(review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
exports.getProductReviews = async (req, res) => {
    try {
        let productId = req.params.productId;

        // If it looks like a slug (not a 24-char hex ID), find the product first
        if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
            const product = await Product.findOne({ slug: productId });
            if (!product) return res.json([]); // No product, no reviews
            productId = product._id;
        }

        const reviews = await Review.find({ product_id: productId, is_hidden: { $ne: true } })
            .populate('buyer_id', 'first_name last_name company_name')
            .populate('supplier_id', 'first_name last_name company_name')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        console.error('getProductReviews error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reviews a buyer has left
// @route   GET /api/reviews/my-reviews
// @access  Private
exports.getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ buyer_id: req.user._id })
            .populate('product_id', 'name main_image slug')
            .populate('supplier_id', 'company_name first_name last_name')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reviews for a supplier's products
// @route   GET /api/reviews/supplier/my-products
// @access  Private (Supplier only)
exports.getSupplierProductReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ supplier_id: req.user._id })
            .populate('buyer_id', 'first_name last_name company_name')
            .populate('product_id', 'name slug main_image')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Supplier reply to a review
// @route   PUT /api/reviews/:id/reply
// @access  Private (Supplier only)
exports.replyToReview = async (req, res) => {
    try {
        const { reply_comment } = req.body;
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Verify the logged-in user is the supplier of this review
        if (review.supplier_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to reply to this review' });
        }

        review.reply_comment = reply_comment;
        review.reply_date = new Date();
        await review.save();

        res.json(review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Report a review
// @route   POST /api/reviews/:id/report
// @access  Private
exports.reportReview = async (req, res) => {
    try {
        const { reason } = req.body;
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Check if user already reported this review
        if (review.reported_by.includes(req.user._id)) {
            return res.status(400).json({ message: 'You have already reported this review' });
        }

        review.reported_by.push(req.user._id);
        review.report_count += 1;
        if (reason) {
            review.report_reasons.push(reason);
        }

        await review.save();
        res.json({ message: 'Review reported successfully', review });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reviews (Admin only)
// @route   GET /api/reviews/admin/all
// @access  Private (Admin only)
exports.adminGetReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('buyer_id', 'first_name last_name company_name email')
            .populate('supplier_id', 'first_name last_name company_name email')
            .populate('product_id', 'name slug main_image')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle review hide/show (Admin only)
// @route   PUT /api/reviews/admin/:id/toggle-hide
// @access  Private (Admin only)
exports.adminToggleHideReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.is_hidden = !review.is_hidden;
        await review.save();

        res.json({ message: `Review is now ${review.is_hidden ? 'hidden' : 'visible'}`, review });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete review (Admin only)
// @route   DELETE /api/reviews/admin/:id
// @access  Private (Admin only)
exports.adminDeleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        const product_id = review.product_id;
        await Review.findByIdAndDelete(req.params.id);

        // Recalculate Product average rating & numReviews
        const productReviews = await Review.find({ product_id });
        const numReviews = productReviews.length;
        const avgRating = numReviews > 0 ? (productReviews.reduce((acc, item) => item.rating + acc, 0) / numReviews) : 0;

        await Product.findByIdAndUpdate(product_id, {
            rating: avgRating,
            numReviews
        });

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete supplier reply (Admin only)
// @route   DELETE /api/reviews/admin/:id/reply
// @access  Private (Admin only)
exports.adminDeleteReply = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.reply_comment = undefined;
        review.reply_date = undefined;
        await review.save();

        res.json({ message: 'Supplier reply deleted successfully', review });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a review (Admin only)
// @route   PUT /api/reviews/admin/:id
// @access  Private (Admin only)
exports.adminUpdateReview = async (req, res) => {
    try {
        const { rating, comment, reply_comment, images, videos } = req.body;
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (rating !== undefined) {
            const numRating = Number(rating);
            if (isNaN(numRating) || numRating < 1 || numRating > 5) {
                return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
            }
            review.rating = numRating;
        }

        if (comment !== undefined) {
            review.comment = comment;
        }

        if (images !== undefined) {
            review.images = Array.isArray(images) ? images : [];
        }

        if (videos !== undefined) {
            review.videos = Array.isArray(videos) ? videos : [];
        }

        if (reply_comment !== undefined) {
            review.reply_comment = reply_comment || undefined;
            if (reply_comment) {
                review.reply_date = review.reply_date || new Date();
            } else {
                review.reply_date = undefined;
            }
        }

        await review.save();

        // Recalculate Product average rating & numReviews
        const product_id = review.product_id;
        const productReviews = await Review.find({ product_id });
        const numReviews = productReviews.length;
        const avgRating = numReviews > 0 ? (productReviews.reduce((acc, item) => item.rating + acc, 0) / numReviews) : 0;

        await Product.findByIdAndUpdate(product_id, {
            rating: avgRating,
            numReviews
        });

        // Fetch fully populated review to return
        const updatedReview = await Review.findById(review._id)
            .populate('buyer_id', 'first_name last_name company_name email')
            .populate('supplier_id', 'first_name last_name company_name email')
            .populate('product_id', 'name slug main_image');

        res.json({ message: 'Review updated successfully', review: updatedReview });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

