const Tender = require('../models/Tender');
const Bid = require('../models/Bid');
const { getIO } = require('../socket/socketHandler');

// @desc    Create a new Tender
// @route   POST /api/tenders
// @access  Private (Buyer/Admin)
const createTender = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            quantity,
            unit,
            start_price,
            min_decrement,
            end_time,
            type,
            invited_suppliers
        } = req.body;

        const tender = new Tender({
            buyer_id: req.user._id,
            title,
            description,
            category,
            quantity,
            unit,
            start_price,
            current_lowest_bid: start_price,
            min_decrement: min_decrement || 10,
            end_time,
            type: type || 'public',
            invited_suppliers: invited_suppliers || []
        });

        await tender.save();
        res.status(201).json({ success: true, data: tender });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get all active Tenders
// @route   GET /api/tenders
// @access  Public
const getTenders = async (req, res) => {
    try {
        const query = { status: { $ne: 'draft' } };

        // Category filter
        if (req.query.category) {
            query.category = req.query.category;
        }

        // Status filter
        if (req.query.status) {
            query.status = req.query.status;
        } else {
            query.status = 'active';
        }

        // Private invitations filter
        if (req.query.invited === 'true' && req.user) {
            query.type = 'private';
            query.invited_suppliers = req.user._id;
        } else if (req.query.invited !== 'true') {
            query.type = 'public';
        }

        const tenders = await Tender.find(query)
            .populate('buyer_id', 'first_name last_name company_name')
            .populate('category', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: tenders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get Tender details and related bids
// @route   GET /api/tenders/:id
// @access  Public
const getTenderById = async (req, res) => {
    try {
        const tender = await Tender.findById(req.params.id)
            .populate('buyer_id', 'first_name last_name company_name')
            .populate('category', 'title');

        if (!tender) {
            return res.status(404).json({ success: false, message: 'Tender not found' });
        }

        // Fetch related bids, sorted lowest price first
        const bids = await Bid.find({ tender_id: tender._id })
            .populate('supplier_id', 'first_name last_name company_name')
            .sort({ price_offered: 1 });

        res.status(200).json({ success: true, data: { tender, bids } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Place a bid on an active Tender
// @route   POST /api/tenders/:id/bid
// @access  Private (Supplier)
const placeBid = async (req, res) => {
    try {
        const { price_offered, delivery_days, notes } = req.body;
        const tenderId = req.params.id;

        const tender = await Tender.findById(tenderId);
        if (!tender) {
            return res.status(404).json({ success: false, message: 'Tender not found' });
        }

        // Check if active
        if (tender.status !== 'active') {
            return res.status(400).json({ success: false, message: `Tender is not active (current status: ${tender.status})` });
        }

        // Check if expired
        if (new Date() > new Date(tender.end_time)) {
            tender.status = 'ended';
            await tender.save();
            return res.status(400).json({ success: false, message: 'Tender bidding time has expired' });
        }

        // Verify private invitation if applicable
        if (tender.type === 'private' && !tender.invited_suppliers.includes(req.user._id)) {
            return res.status(403).json({ success: false, message: 'You are not invited to participate in this private tender' });
        }

        // Validate Bid Decrement constraint
        const currentLowest = tender.current_lowest_bid !== undefined ? tender.current_lowest_bid : tender.start_price;
        const requiredMaxPrice = currentLowest - tender.min_decrement;

        if (price_offered > requiredMaxPrice) {
            return res.status(400).json({
                success: false,
                message: `Your bid of ${price_offered} does not satisfy the minimum decrement step. Maximum allowed bid is ${requiredMaxPrice} (Current lowest: ${currentLowest}, Decrement: ${tender.min_decrement})`
            });
        }

        // Create and save the Bid record
        const bid = new Bid({
            tender_id: tenderId,
            supplier_id: req.user._id,
            price_offered,
            delivery_days,
            notes
        });
        await bid.save();

        // Update the lowest bid status on the Tender
        tender.current_lowest_bid = price_offered;
        await tender.save();

        const populatedBid = await Bid.findById(bid._id)
            .populate('supplier_id', 'first_name last_name company_name');

        // Emit real-time update to Tender socket room
        const io = getIO();
        if (io) {
            io.to(`tender_${tenderId}`).emit('bidPlaced', {
                bid: populatedBid,
                current_lowest_bid: price_offered
            });
            console.log(`📡 Socket: Broadcasted new bid placed on tender_${tenderId}`);
        }

        res.status(201).json({ success: true, data: populatedBid });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Award a Tender
// @route   POST /api/tenders/:id/award
// @access  Private (Buyer/Tender Owner)
const awardTender = async (req, res) => {
    try {
        const { bid_id } = req.body;
        const tenderId = req.params.id;

        const tender = await Tender.findById(tenderId);
        if (!tender) {
            return res.status(404).json({ success: false, message: 'Tender not found' });
        }

        // Verify ownership
        if (tender.buyer_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only the tender creator can award it' });
        }

        const bid = await Bid.findById(bid_id);
        if (!bid) {
            return res.status(404).json({ success: false, message: 'Select bid is not found' });
        }

        // Complete the Tender Award
        tender.status = 'awarded';
        tender.winning_bid_id = bid_id;
        await tender.save();

        // Emit award socket notification
        const io = getIO();
        if (io) {
            io.to(`tender_${tenderId}`).emit('tenderAwarded', {
                tender,
                winning_bid: bid
            });
        }

        res.status(200).json({ success: true, message: 'Tender awarded successfully', data: tender });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    createTender,
    getTenders,
    getTenderById,
    placeBid,
    awardTender
};
