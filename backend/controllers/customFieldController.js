const mongoose = require('mongoose');
const CustomField = require('../models/CustomField');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');

// Helper to recursively fetch ancestor category IDs
const getAncestorCategoryIds = async (categoryId, list = []) => {
    if (!categoryId) return list;
    const category = await Category.findById(categoryId);
    if (!category) return list;
    list.push(category._id.toString());
    if (category.parent) {
        return getAncestorCategoryIds(category.parent, list);
    }
    return list;
};

// @desc    Get all custom fields
// @route   GET /api/custom-fields
// @access  Private/Admin
exports.getCustomFields = async (req, res) => {
    try {
        const fields = await CustomField.find()
            .populate('categories', 'title parent')
            .sort({ order: 1, createdAt: -1 });
        res.json(fields);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a custom field
// @route   POST /api/custom-fields
// @access  Private/Admin
exports.createCustomField = async (req, res) => {
    try {
        const { name, type, minLength, maxLength, isRequired, showFilter, order, status } = req.body;
        
        let categories = req.body.categories;
        if (typeof categories === 'string') {
            try { categories = JSON.parse(categories); } catch (e) { categories = []; }
        }

        let options = req.body.options;
        if (typeof options === 'string') {
            try { options = JSON.parse(options); } catch (e) { options = []; }
        }

        const fieldExists = await CustomField.findOne({ name });
        if (fieldExists) {
            return res.status(400).json({ message: 'Custom field with this name already exists' });
        }

        const icon = req.file
            ? `/uploads/customfields/${req.file.filename}`
            : '';

        const field = await CustomField.create({
            name,
            type,
            minLength: minLength ? Number(minLength) : null,
            maxLength: maxLength ? Number(maxLength) : null,
            options: options || [],
            categories: categories || [],
            isRequired: isRequired === 'true' || isRequired === true,
            showFilter: showFilter === 'true' || showFilter === true,
            icon,
            order: order ? Number(order) : 0,
            status: status || 'active'
        });

        res.status(201).json(field);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a custom field
// @route   PUT /api/custom-fields/:id
// @access  Private/Admin
exports.updateCustomField = async (req, res) => {
    try {
        const { name, type, minLength, maxLength, isRequired, showFilter, order, status } = req.body;
        const field = await CustomField.findById(req.params.id);

        if (!field) {
            return res.status(404).json({ message: 'Custom field not found' });
        }

        let categories = req.body.categories;
        if (typeof categories === 'string') {
            try { categories = JSON.parse(categories); } catch (e) { categories = []; }
        }

        let options = req.body.options;
        if (typeof options === 'string') {
            try { options = JSON.parse(options); } catch (e) { options = []; }
        }

        if (name && name !== field.name) {
            const fieldExists = await CustomField.findOne({ name });
            if (fieldExists) {
                return res.status(400).json({ message: 'Custom field with this name already exists' });
            }
            field.name = name;
        }

        if (req.file) {
            // Delete old icon if exists
            if (field.icon) {
                const oldPath = path.join(__dirname, '..', field.icon);
                if (fs.existsSync(oldPath)) {
                    try { fs.unlinkSync(oldPath); } catch (e) { }
                }
            }
            field.icon = `/uploads/customfields/${req.file.filename}`;
        }

        field.type = type || field.type;
        field.minLength = minLength !== undefined ? (minLength ? Number(minLength) : null) : field.minLength;
        field.maxLength = maxLength !== undefined ? (maxLength ? Number(maxLength) : null) : field.maxLength;
        field.options = options || field.options;
        field.categories = categories || field.categories;
        field.isRequired = isRequired !== undefined ? (isRequired === 'true' || isRequired === true) : field.isRequired;
        field.showFilter = showFilter !== undefined ? (showFilter === 'true' || showFilter === true) : field.showFilter;
        field.order = order !== undefined ? Number(order) : field.order;
        field.status = status || field.status;

        const updatedField = await field.save();
        res.json(updatedField);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a custom field
// @route   DELETE /api/custom-fields/:id
// @access  Private/Admin
exports.deleteCustomField = async (req, res) => {
    try {
        const field = await CustomField.findById(req.params.id);
        if (!field) {
            return res.status(404).json({ message: 'Custom field not found' });
        }

        // Delete icon file if exists
        if (field.icon) {
            const oldPath = path.join(__dirname, '..', field.icon);
            if (fs.existsSync(oldPath)) {
                try { fs.unlinkSync(oldPath); } catch (e) { }
            }
        }

        await CustomField.findByIdAndDelete(req.params.id);
        res.json({ message: 'Custom field removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get custom fields associated with a category and its ancestors
// @route   GET /api/custom-fields/category/:categoryId
// @access  Public
exports.getCustomFieldsByCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        if (!categoryId) {
            return res.status(400).json({ message: 'Category ID is required' });
        }

        // Retrieve ancestor category IDs recursively
        const categoryIds = await getAncestorCategoryIds(categoryId);

        // Convert string IDs to mongoose ObjectIds to match the DB schema correctly
        const objectIds = categoryIds.map(id => new mongoose.Types.ObjectId(id));

        // Find custom fields that contain any of these categories in their array and are active
        const fields = await CustomField.find({
            categories: { $in: objectIds },
            status: 'active'
        }).sort({ order: 1, name: 1 });

        res.json(fields);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
