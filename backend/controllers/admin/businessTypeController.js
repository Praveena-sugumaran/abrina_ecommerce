const BusinessType = require('../../models/BusinessType');

// @desc    Get all business types
// @route   GET /api/admin/business-types
// @access  Private/Admin
const getBusinessTypes = async (req, res) => {
    try {
        const businessTypes = await BusinessType.find().sort({ name: 1 });
        res.json(businessTypes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a business type
// @route   POST /api/admin/business-types
// @access  Private/Admin
const createBusinessType = async (req, res) => {
    try {
        const { name, status } = req.body;
        const businessType = await BusinessType.create({ name, status });
        res.status(201).json(businessType);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a business type
// @route   PUT /api/admin/business-types/:id
// @access  Private/Admin
const updateBusinessType = async (req, res) => {
    try {
        const { name, status } = req.body;
        const businessType = await BusinessType.findById(req.params.id);

        if (businessType) {
            businessType.name = name || businessType.name;
            businessType.status = status || businessType.status;
            const updated = await businessType.save();
            res.json(updated);
        } else {
            res.status(404).json({ message: 'Business type not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a business type
// @route   DELETE /api/admin/business-types/:id
// @access  Private/Admin
const deleteBusinessType = async (req, res) => {
    try {
        const businessType = await BusinessType.findById(req.params.id);
        if (businessType) {
            await businessType.deleteOne();
            res.json({ message: 'Business type removed' });
        } else {
            res.status(404).json({ message: 'Business type not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getBusinessTypes,
    createBusinessType,
    updateBusinessType,
    deleteBusinessType
};
