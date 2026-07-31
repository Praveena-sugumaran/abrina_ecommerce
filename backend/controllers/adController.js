const AdCampaign = require('../models/AdCampaign');
const Product = require('../models/Product');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @desc    Create a new PPC or CPM ad campaign
// @route   POST /api/ads/campaigns
// @access  Private (Supplier)
exports.createAdCampaign = async (req, res) => {
    try {
        const { campaign_name, product_id, budget_type, budget_amount, cpc_bid, cpm_bid, campaign_type = 'cpc', keywords } = req.body;

        if (!campaign_name || !product_id || !budget_amount) {
            return res.status(400).json({ message: 'Campaign name, product, and budget amount are required.' });
        }

        if (campaign_type === 'cpc' && (!cpc_bid || parseFloat(cpc_bid) <= 0)) {
            return res.status(400).json({ message: 'CPC bid is required and must be greater than 0 for CPC campaigns.' });
        }

        if (campaign_type === 'cpm' && (!cpm_bid || parseFloat(cpm_bid) <= 0)) {
            return res.status(400).json({ message: 'CPM bid is required and must be greater than 0 for CPM campaigns.' });
        }

        // Check if product exists and belongs to this supplier
        const product = await Product.findById(product_id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        if (product.supplier.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to advertise this product.' });
        }

        // Verify supplier has enough wallet balance to start
        const supplier = await User.findById(req.user._id);
        const requiredBid = campaign_type === 'cpc' ? parseFloat(cpc_bid) : (parseFloat(cpm_bid) / 1000);
        if (supplier.wallet_balance < requiredBid) {
            return res.status(400).json({ message: 'Insufficient wallet balance to start an ad campaign. Please top up your wallet.' });
        }

        const adCampaign = new AdCampaign({
            supplier_id: req.user._id,
            product_id,
            campaign_name,
            budget_type,
            budget_amount,
            campaign_type,
            cpc_bid: campaign_type === 'cpc' ? parseFloat(cpc_bid) : 0,
            cpm_bid: campaign_type === 'cpm' ? parseFloat(cpm_bid) : 0,
            keywords: Array.isArray(keywords) ? keywords.map(k => k.trim().toLowerCase()) : [],
            status: 'active'
        });

        const saved = await adCampaign.save();
        res.status(201).json({ success: true, campaign: saved });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get all ad campaigns for the current supplier or admin
// @route   GET /api/ads/campaigns
// @access  Private
exports.getAdCampaigns = async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { supplier_id: req.user._id };
        const campaigns = await AdCampaign.find(query)
            .populate('product_id', 'name main_image images slug main_price countInStock')
            .sort({ createdAt: -1 });

        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update ad campaign settings
// @route   PUT /api/ads/campaigns/:id
// @access  Private (Supplier)
exports.updateAdCampaign = async (req, res) => {
    try {
        const campaign = await AdCampaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found.' });
        }

        // Authorize
        if (req.user.role !== 'admin' && campaign.supplier_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized.' });
        }

        const { campaign_name, budget_amount, cpc_bid, cpm_bid, keywords, status } = req.body;

        if (campaign_name) campaign.campaign_name = campaign_name;
        if (budget_amount !== undefined) campaign.budget_amount = budget_amount;
        if (cpc_bid !== undefined) campaign.cpc_bid = cpc_bid;
        if (cpm_bid !== undefined) campaign.cpm_bid = cpm_bid;
        if (keywords) campaign.keywords = Array.isArray(keywords) ? keywords.map(k => k.trim().toLowerCase()) : [];
        if (status) campaign.status = status;

        // Reset status to active if budget limits are expanded
        if (campaign.spent_amount < campaign.budget_amount && campaign.status === 'exhausted') {
            campaign.status = 'active';
        }

        const updated = await campaign.save();
        res.json({ success: true, campaign: updated });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Track click on a sponsored product
// @route   POST /api/ads/click/:id
// @access  Public
exports.trackAdClick = async (req, res) => {
    try {
        const campaign = await AdCampaign.findById(req.params.id);
        if (!campaign || campaign.status !== 'active') {
            return res.status(404).json({ message: 'Active campaign not found.' });
        }

        // For CPM campaigns, clicks are tracked but NOT billed per click
        if (campaign.campaign_type === 'cpm') {
            campaign.clicks += 1;
            await campaign.save();
            return res.json({ success: true, clicks: campaign.clicks, spent_amount: campaign.spent_amount });
        }

        // Verify supplier has enough wallet balance
        const supplier = await User.findById(campaign.supplier_id);
        if (!supplier || supplier.wallet_balance < campaign.cpc_bid) {
            campaign.status = 'paused';
            await campaign.save();
            return res.status(400).json({ message: 'Campaign paused due to supplier insufficient funds.' });
        }

        // Deduct CPC from supplier wallet
        supplier.wallet_balance = Math.max(0, supplier.wallet_balance - campaign.cpc_bid);
        await supplier.save();

        // Log transaction debit
        await Transaction.create({
            user_id: supplier._id,
            type: 'debit',
            amount: campaign.cpc_bid,
            status: 'completed',
            description: `CPC click charge for campaign: ${campaign.campaign_name} (Product: ${campaign.product_id})`
        });

        // Update campaign counters
        campaign.clicks += 1;
        campaign.spent_amount = parseFloat((campaign.spent_amount + campaign.cpc_bid).toFixed(2));

        // Check if budget is exhausted
        if (campaign.spent_amount >= campaign.budget_amount) {
            campaign.status = 'exhausted';
        }

        await campaign.save();
        res.json({ success: true, clicks: campaign.clicks, spent_amount: campaign.spent_amount });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Charge a CPM campaign for an impression (billed as cpm_bid / 1000)
// @access  Internal
exports.chargeCpmImpression = async (campaignId) => {
    try {
        const campaign = await AdCampaign.findById(campaignId);
        if (!campaign || campaign.status !== 'active' || campaign.campaign_type !== 'cpm') {
            return;
        }

        const costPerImpression = campaign.cpm_bid / 1000;

        // Verify supplier exists and has wallet balance
        const supplier = await User.findById(campaign.supplier_id);
        if (!supplier || supplier.wallet_balance < costPerImpression) {
            campaign.status = 'paused';
            await campaign.save();
            return;
        }

        // Deduct cost from supplier wallet
        supplier.wallet_balance = Math.max(0, parseFloat((supplier.wallet_balance - costPerImpression).toFixed(4)));
        await supplier.save();

        // Update campaign impressions, unbilled_spent, and spent_amount
        campaign.impressions += 1;
        campaign.unbilled_spent = parseFloat((campaign.unbilled_spent + costPerImpression).toFixed(4));
        campaign.spent_amount = parseFloat((campaign.spent_amount + costPerImpression).toFixed(4));

        // If unbilled_spent >= 0.10, log a consolidated transaction
        if (campaign.unbilled_spent >= 0.10) {
            await Transaction.create({
                user_id: supplier._id,
                type: 'debit',
                amount: parseFloat(campaign.unbilled_spent.toFixed(2)),
                status: 'completed',
                description: `CPM impressions charge (100+ views) for campaign: ${campaign.campaign_name} (Product: ${campaign.product_id})`
            });
            campaign.unbilled_spent = 0; // Reset unbilled counter
        }

        // Check if budget is exhausted
        if (campaign.spent_amount >= campaign.budget_amount) {
            campaign.status = 'exhausted';
            // Flush any remaining unbilled spent to transactions
            if (campaign.unbilled_spent > 0) {
                await Transaction.create({
                    user_id: supplier._id,
                    type: 'debit',
                    amount: parseFloat(campaign.unbilled_spent.toFixed(4)),
                    status: 'completed',
                    description: `Final CPM impressions charge for campaign: ${campaign.campaign_name}`
                });
                campaign.unbilled_spent = 0;
            }
        }

        await campaign.save();
    } catch (err) {
        console.error('Error charging CPM impression:', err);
    }
};

// @desc    Get active sponsored products for the homepage
// @route   GET /api/ads/public/sponsored
// @access  Public
exports.getPublicSponsoredProducts = async (req, res) => {
    try {
        const campaigns = await AdCampaign.find({ status: 'active' })
            .populate({
                path: 'product_id',
                populate: { path: 'supplier', select: 'company_name logo country_code' }
            })
            .sort({ cpc_bid: -1, cpm_bid: -1 });

        const products = campaigns
            .filter(c => c.product_id)
            .map(c => {
                const prod = c.product_id.toObject();
                prod.isSponsored = true;
                prod.adCampaignId = c._id;
                return prod;
            });

        // Track impressions asynchronously
        for (const campaign of campaigns) {
            if (campaign.campaign_type === 'cpm') {
                exports.chargeCpmImpression(campaign._id).catch(err => console.error('Error charging CPM impression:', err));
            } else {
                AdCampaign.updateOne(
                    { _id: campaign._id },
                    { $inc: { impressions: 1 } }
                ).catch(err => console.error('Error tracking CPC ad impressions:', err));
            }
        }

        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Track an impression on an ad campaign manually
// @route   POST /api/ads/impression/:id
// @access  Public
exports.trackAdImpression = async (req, res) => {
    try {
        const campaign = await AdCampaign.findById(req.params.id);
        if (!campaign || campaign.status !== 'active') {
            return res.status(404).json({ message: 'Active campaign not found.' });
        }

        if (campaign.campaign_type === 'cpm') {
            await exports.chargeCpmImpression(campaign._id);
        } else {
            campaign.impressions += 1;
            await campaign.save();
        }

        res.json({ success: true, impressions: campaign.impressions, spent_amount: campaign.spent_amount });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
