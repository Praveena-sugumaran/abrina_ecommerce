const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { uploadCategoryImage } = require('../middlewares/uploadMiddleware');

router.route('/')
    .get(getCategories)
    .post(protect, authorizeRoles('admin'), uploadCategoryImage, createCategory);

router.route('/:id')
    .put(protect, authorizeRoles('admin'), uploadCategoryImage, updateCategory)
    .delete(protect, authorizeRoles('admin'), deleteCategory);

module.exports = router;
