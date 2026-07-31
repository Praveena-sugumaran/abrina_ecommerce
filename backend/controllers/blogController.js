const Blog = require('../models/Blog');

// @desc    Retrieve all blog posts
// @route   GET /api/blog
// @access  Public
exports.getBlogPosts = async (req, res) => {
    try {
        const posts = await Blog.find({}).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Retrieve a single blog post by slug
// @route   GET /api/blog/:slug
// @access  Public
exports.getBlogPostBySlug = async (req, res) => {
    try {
        const post = await Blog.findOne({ slug: req.params.slug });
        if (!post) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create a new blog post (Admin only)
// @route   POST /api/blog
// @access  Private/Admin
exports.createBlogPost = async (req, res) => {
    try {
        const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';
        if (!isAdmin) {
            return res.status(403).json({ message: 'Admin access required.' });
        }

        const { title, content, image, category } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required.' });
        }

        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const post = await Blog.create({
            title,
            slug,
            content,
            image,
            category: category || 'General',
            author: `${req.user.first_name || 'Admin'} ${req.user.last_name || ''}`.trim()
        });

        res.status(201).json({ success: true, post });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update a blog post (Admin only)
// @route   PUT /api/blog/:id
// @access  Private/Admin
exports.updateBlogPost = async (req, res) => {
    try {
        const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';
        if (!isAdmin) {
            return res.status(403).json({ message: 'Admin access required.' });
        }

        const { title, content, image, category } = req.body;
        const post = await Blog.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        if (title) {
            post.title = title;
            post.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        if (content !== undefined) post.content = content;
        if (image !== undefined) post.image = image;
        if (category !== undefined) post.category = category;

        await post.save();
        res.json({ success: true, post, message: 'Blog post updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete a blog post (Admin only)
// @route   DELETE /api/blog/:id
// @access  Private/Admin
exports.deleteBlogPost = async (req, res) => {
    try {
        const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';
        if (!isAdmin) {
            return res.status(403).json({ message: 'Admin access required.' });
        }

        const post = await Blog.findByIdAndDelete(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        res.json({ success: true, message: 'Blog post deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
