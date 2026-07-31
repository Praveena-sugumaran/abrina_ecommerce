const express = require('express');
const router = express.Router();
const {
    getCustomFields,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    getCustomFieldsByCategory
} = require('../controllers/customFieldController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { uploadCustomFieldIcon } = require('../middlewares/uploadMiddleware');

// Administrative CRUD operations
router.route('/')
    .get(protect, authorizeRoles('admin'), getCustomFields)
    .post(protect, authorizeRoles('admin'), uploadCustomFieldIcon, createCustomField);

router.route('/:id')
    .put(protect, authorizeRoles('admin'), uploadCustomFieldIcon, updateCustomField)
    .delete(protect, authorizeRoles('admin'), deleteCustomField);

// Public/Seller category field resolution
router.route('/category/:categoryId')
    .get(getCustomFieldsByCategory);

module.exports = router;
