const mongoose = require('mongoose');
const Category = require('../models/Category');

// @desc    Get all categories (as a tree)
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
    try {
        const { flat } = req.query;
        const Category = require('../models/Category');
        const Product = require('../models/Product');
        
        const categories = await Category.find().sort({ order: 1 });
        
        // Aggregate product counts for each category
        const productCounts = await Product.aggregate([
            { $match: { status: 'active', approval_status: 'approved' } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);

        const countsMap = {};
        productCounts.forEach(c => {
            if (c._id) {
                countsMap[c._id.toString()] = c.count;
            }
        });

        const getDescendantsCount = (catId) => {
            let count = countsMap[catId] || 0;
            const children = categories.filter(c => c.parent && c.parent.toString() === catId);
            children.forEach(child => {
                count += getDescendantsCount(child._id.toString());
            });
            return count;
        };

        if (flat === 'true') {
            const flatCategories = categories.map(cat => {
                const catObj = cat.toObject();
                catObj.product_count = getDescendantsCount(cat._id.toString());
                return catObj;
            });
            return res.json(flatCategories);
        }

        // Build Tree Structure
        const categoryMap = {};
        const tree = [];

        categories.forEach(cat => {
            const catObj = cat.toObject();
            catObj.children = [];
            categoryMap[cat._id.toString()] = catObj;
        });

        // Compute recursive product count for all categories
        Object.keys(categoryMap).forEach(id => {
            categoryMap[id].product_count = getDescendantsCount(id);
        });

        categories.forEach(cat => {
            const id = cat._id.toString();
            if (cat.parent) {
                const parentId = cat.parent.toString();
                if (categoryMap[parentId]) {
                    categoryMap[parentId].children.push(categoryMap[id]);
                } else {
                    tree.push(categoryMap[id]);
                }
            } else {
                tree.push(categoryMap[id]);
            }
        });

        res.json(tree);
    } catch (error) {
        require('fs').appendFileSync('error.log', `Category Error: ${error.message}\n${error.stack}\n`);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
    try {
        const { title, description, status, parent, order } = req.body;
        const image = req.file
            ? `/uploads/categories/${req.file.filename}`
            : req.body.image || undefined;

        const categoryExists = await Category.findOne({ title });
        if (categoryExists) {
            return res.status(400).json({ message: 'Category already exists' });
        }

        const category = await Category.create({
            title,
            description,
            image,
            status,
            parent: parent || null,
            order: order || 0
        });

        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
    try {
        const { title, description, status, parent, order } = req.body;
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const image = req.file
            ? `/uploads/categories/${req.file.filename}`
            : req.body.image || category.image;

        category.title = title || category.title;
        category.description = description || category.description;
        category.image = image;
        category.status = status || category.status;
        category.parent = parent !== undefined ? parent : category.parent;
        category.order = order !== undefined ? order : category.order;

        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Check if it has children
        const hasChildren = await Category.findOne({ parent: req.params.id });
        if (hasChildren) {
            return res.status(400).json({ message: 'Cannot delete category with subcategories' });
        }

        await category.deleteOne();
        res.json({ message: 'Category removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
