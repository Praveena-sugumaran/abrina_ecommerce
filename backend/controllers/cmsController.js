const Page = require('../models/Page');

// @desc    Get all pages
// @route   GET /api/cms/pages
exports.getPages = async (req, res) => {
    try {
        const pages = await Page.find().sort('-createdAt');
        res.json(pages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get single page by slug
// @route   GET /api/cms/pages/:slug
exports.getPageBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        let page = await Page.findOne({ slug });

        // Try matching with hyphens/underscores normalized
        if (!page && slug.includes('_')) {
            page = await Page.findOne({ slug: slug.replace(/_/g, '-') });
        }
        if (!page && slug.includes('-')) {
            page = await Page.findOne({ slug: slug.replace(/-/g, '_') });
        }

        if (!page) return res.status(404).json({ message: 'Page not found' });
        res.json(page);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update page (Admin only)
// @route   PUT /api/cms/:id
exports.updatePage = async (req, res) => {
    try {
        const { title, slug, content, isPublished, metaDescription } = req.body;
        const page = await Page.findById(req.params.id);
        if (!page) return res.status(404).json({ message: 'Page not found' });

        page.title = title;
        page.slug = slug;
        page.content = content;
        page.isPublished = isPublished;
        page.metaDescription = metaDescription;

        await page.save();
        res.json(page);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// @desc    Create/Update page (Admin only)
// @route   POST /api/cms/pages
exports.upsertPage = async (req, res) => {
    try {
        const { title, slug, content, isPublished, metaDescription } = req.body;

        let page = await Page.findOne({ slug });
        if (page) {
            page.title = title;
            page.content = content;
            page.isPublished = isPublished;
            page.metaDescription = metaDescription;
            await page.save();
        } else {
            page = await Page.create({ title, slug, content, isPublished, metaDescription });
        }

        res.status(201).json(page);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete page (Admin only)
// @route   DELETE /api/cms/pages/:id
exports.deletePage = async (req, res) => {
    try {
        await Page.findByIdAndDelete(req.params.id);
        res.json({ message: 'Page deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
