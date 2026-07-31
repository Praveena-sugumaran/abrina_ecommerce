const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getBlogPosts, getBlogPostBySlug, createBlogPost, updateBlogPost, deleteBlogPost } = require('../controllers/blogController');

// Public listing & single post lookup
router.get('/', getBlogPosts);
router.get('/:slug', getBlogPostBySlug);

// Admin creations, update & deletion actions
router.post('/', protect, createBlogPost);
router.put('/:id', protect, updateBlogPost);
router.delete('/:id', protect, deleteBlogPost);

module.exports = router;
