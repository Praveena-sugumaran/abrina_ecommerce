const SaleCampaign = require('../models/SaleCampaign');

// Public - Get active campaign
exports.getActiveCampaign = async (req, res) => {
    try {
        const now = new Date();
        const campaign = await SaleCampaign.findOne({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        });
        res.status(200).json(campaign);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch active campaign', error: err.message });
    }
};

// Admin - Get all campaigns
exports.getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await SaleCampaign.find().sort({ createdAt: -1 });
        res.status(200).json(campaigns);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch campaigns', error: err.message });
    }
};

// Admin - Create campaign
exports.createCampaign = async (req, res) => {
    try {
        const campaign = new SaleCampaign(req.body);
        await campaign.save();
        res.status(201).json(campaign);
    } catch (err) {
        res.status(400).json({ message: 'Failed to create campaign', error: err.message });
    }
};

// Admin - Update campaign
exports.updateCampaign = async (req, res) => {
    try {
        const campaign = await SaleCampaign.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
        res.status(200).json(campaign);
    } catch (err) {
        res.status(400).json({ message: 'Failed to update campaign', error: err.message });
    }
};

// Admin - Delete campaign
exports.deleteCampaign = async (req, res) => {
    try {
        const campaign = await SaleCampaign.findByIdAndDelete(req.params.id);
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
        res.status(200).json({ message: 'Campaign deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: 'Failed to delete campaign', error: err.message });
    }
};
