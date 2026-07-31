const IndustryHub = require('../models/IndustryHub');
const TopRanking = require('../models/TopRanking');
const path = require('path');
const fs = require('fs');

// ─── PUBLIC ───────────────────────────────────────────
// GET /api/worldwide/countries
exports.getCountries = async (req, res) => {
    try {
        const Country = require('../models/Country');
        const dbCountries = await Country.find({}).sort({ name: 1 });
        const countries = dbCountries.map(c => ({
            name: c.name,
            flag: c.code ? c.code.toLowerCase() : ''
        }));
        res.json({ success: true, countries });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/worldwide
exports.getWorldwideContent = async (req, res) => {
    try {
        const countryFilter = req.query.country;
        let hubQuery = { isActive: true };
        let rankQuery = { isActive: true };
        if (countryFilter) {
            hubQuery.flag = countryFilter.toLowerCase();
            rankQuery.flag = countryFilter.toLowerCase();
        }
        const hubs = await IndustryHub.find(hubQuery)
            .populate('sideProduct1')
            .populate('sideProduct2')
            .sort({ order: 1 });
        const rankings = await TopRanking.find(rankQuery).sort({ createdAt: -1 });
        res.json({ success: true, hubs, rankings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── ADMIN: Industry Hubs CRUD ────────────────────────
// GET /api/worldwide/admin/hubs
exports.getAllHubs = async (req, res) => {
    try {
        const hubs = await IndustryHub.find().sort({ order: 1 });
        res.json({ success: true, hubs });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// POST /api/worldwide/admin/hubs
exports.createHub = async (req, res) => {
    try {
        const { title, desc, country, flag, sideImage1Url, sideImage2Url, isActive, sideProduct1, sideProduct2, order } = req.body;
        let image = req.body.imageUrl || '';
        let sideImages = [];

        // Handle uploaded files
        if (req.files) {
            if (req.files.image) image = `/uploads/worldwide/${req.files.image[0].filename}`;
            if (req.files.sideImage1) sideImages.push(`/uploads/worldwide/${req.files.sideImage1[0].filename}`);
            else if (sideImage1Url) sideImages.push(sideImage1Url);
            if (req.files.sideImage2) sideImages.push(`/uploads/worldwide/${req.files.sideImage2[0].filename}`);
            else if (sideImage2Url) sideImages.push(sideImage2Url);
        } else {
            if (sideImage1Url) sideImages.push(sideImage1Url);
            if (sideImage2Url) sideImages.push(sideImage2Url);
        }

        const hub = new IndustryHub({
            title, desc, country, flag, image, sideImages,
            sideProduct1: sideProduct1 || null,
            sideProduct2: sideProduct2 || null,
            isActive: isActive !== 'false',
            order: Number(order) || 0
        });
        await hub.save();
        res.status(201).json({ success: true, hub });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// PUT /api/worldwide/admin/hubs/:id
exports.updateHub = async (req, res) => {
    try {
        const hub = await IndustryHub.findById(req.params.id);
        if (!hub) return res.status(404).json({ message: 'Hub not found' });

        const { title, desc, country, flag, isActive, sideImage1Url, sideImage2Url, sideProduct1, sideProduct2, order } = req.body;
        if (title) hub.title = title;
        if (desc) hub.desc = desc;
        if (country) hub.country = country;
        if (flag) hub.flag = flag;
        if (isActive !== undefined) hub.isActive = isActive !== 'false';
        if (sideProduct1 !== undefined) hub.sideProduct1 = sideProduct1 || null;
        if (sideProduct2 !== undefined) hub.sideProduct2 = sideProduct2 || null;
        if (order !== undefined) hub.order = Number(order) || 0;

        if (req.files) {
            if (req.files.image) hub.image = `/uploads/worldwide/${req.files.image[0].filename}`;
            let sides = [...hub.sideImages];
            if (req.files.sideImage1) sides[0] = `/uploads/worldwide/${req.files.sideImage1[0].filename}`;
            else if (sideImage1Url !== undefined) sides[0] = sideImage1Url;
            if (req.files.sideImage2) sides[1] = `/uploads/worldwide/${req.files.sideImage2[0].filename}`;
            else if (sideImage2Url !== undefined) sides[1] = sideImage2Url;
            hub.sideImages = sides;
        } else {
            if (sideImage1Url !== undefined) hub.sideImages[0] = sideImage1Url;
            if (sideImage2Url !== undefined) hub.sideImages[1] = sideImage2Url;
        }

        await hub.save();
        res.json({ success: true, hub });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// DELETE /api/worldwide/admin/hubs/:id
exports.deleteHub = async (req, res) => {
    try {
        await IndustryHub.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Hub deleted' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// ─── ADMIN: Top Rankings CRUD ─────────────────────────
// GET /api/worldwide/admin/rankings
exports.getAllRankings = async (req, res) => {
    try {
        const rankings = await TopRanking.find().sort({ createdAt: -1 });
        res.json({ success: true, rankings });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// POST /api/worldwide/admin/rankings
exports.createRanking = async (req, res) => {
    try {
        const { category, country, flag, items, isActive } = req.body;
        let parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
        const ranking = new TopRanking({ category, country, flag, items: parsedItems, isActive: isActive !== 'false' });
        await ranking.save();
        res.status(201).json({ success: true, ranking });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// PUT /api/worldwide/admin/rankings/:id
exports.updateRanking = async (req, res) => {
    try {
        const { category, country, flag, items, isActive } = req.body;
        let parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
        const ranking = await TopRanking.findByIdAndUpdate(
            req.params.id,
            { category, country, flag, items: parsedItems, isActive: isActive !== 'false' },
            { new: true }
        );
        if (!ranking) return res.status(404).json({ message: 'Ranking not found' });
        res.json({ success: true, ranking });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// DELETE /api/worldwide/admin/rankings/:id
exports.deleteRanking = async (req, res) => {
    try {
        await TopRanking.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Ranking deleted' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
