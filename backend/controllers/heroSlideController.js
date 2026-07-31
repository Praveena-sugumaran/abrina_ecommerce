const HeroSlide = require('../models/HeroSlide');
const BannerAnalytics = require('../models/BannerAnalytics');

// Public - Get active slides
exports.getActiveSlides = async (req, res) => {
    try {
        const slides = await HeroSlide.find({ isActive: true })
            .populate({
                path: 'products',
                select: 'name images main_price oldPrice sale_price'
            })
            .sort({ priority: -1, order: 1 });
        res.status(200).json(slides);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch slides', error: err.message });
    }
};

// Admin - Get all slides with view/click statistics
exports.getAllSlides = async (req, res) => {
    try {
        const slides = await HeroSlide.find()
            .populate({
                path: 'products',
                select: 'name images main_price oldPrice sale_price'
            })
            .sort({ priority: -1, order: 1, createdAt: -1 });
        const analytics = await BannerAnalytics.find();
        
        // Map analytics by bannerId for quick lookup
        const analyticsMap = {};
        analytics.forEach(item => {
            analyticsMap[item.bannerId.toString()] = {
                impressions: item.impressions,
                clicks: item.clicks
            };
        });

        const slidesWithStats = slides.map(slide => {
            const stats = analyticsMap[slide._id.toString()] || { impressions: 0, clicks: 0 };
            return {
                ...slide.toObject(),
                impressions: stats.impressions,
                clicks: stats.clicks
            };
        });

        res.status(200).json(slidesWithStats);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch slides', error: err.message });
    }
};

// Admin - Create slide
exports.createSlide = async (req, res) => {
    try {
        const slide = new HeroSlide(req.body);
        await slide.save();
        res.status(201).json(slide);
    } catch (err) {
        res.status(400).json({ message: 'Failed to create slide', error: err.message });
    }
};

// Admin - Update slide
exports.updateSlide = async (req, res) => {
    try {
        const slide = await HeroSlide.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!slide) return res.status(404).json({ message: 'Slide not found' });
        res.status(200).json(slide);
    } catch (err) {
        res.status(400).json({ message: 'Failed to update slide', error: err.message });
    }
};

// Admin - Delete slide
exports.deleteSlide = async (req, res) => {
    try {
        // Also delete associated analytics
        await BannerAnalytics.findOneAndDelete({ bannerId: req.params.id });
        const slide = await HeroSlide.findByIdAndDelete(req.params.id);
        if (!slide) return res.status(404).json({ message: 'Slide not found' });
        res.status(200).json({ message: 'Slide deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: 'Failed to delete slide', error: err.message });
    }
};

// Public/Front-end - Track slide impression or click
exports.trackSlide = async (req, res) => {
    const { id } = req.params;
    const { type } = req.body; // 'impression' or 'click'
    if (type !== 'impression' && type !== 'click') {
        return res.status(400).json({ message: 'Invalid track type' });
    }
    try {
        let record = await BannerAnalytics.findOne({ bannerId: id });
        if (!record) {
            record = new BannerAnalytics({ bannerId: id });
        }
        if (type === 'impression') {
            record.impressions += 1;
        } else {
            record.clicks += 1;
        }
        await record.save();
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to track slide activity', error: err.message });
    }
};

