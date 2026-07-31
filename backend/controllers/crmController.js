const CrmLead = require('../models/CrmLead');
const Company = require('../models/Company');

// @desc    Get all CRM leads for a supplier
// @route   GET /api/crm/leads
// @access  Private (Supplier or Admin)
exports.getLeads = async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { supplier_id: req.user._id };
        const leads = await CrmLead.find(query)
            .populate('buyer_id', 'first_name last_name email phone_number country_code company_name profile_image')
            .sort({ last_contact_date: -1 });

        res.json(leads);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update status or notes for a lead
// @route   PUT /api/crm/leads/:id
// @access  Private
exports.updateLead = async (req, res) => {
    try {
        const { status, notes } = req.body;
        const lead = await CrmLead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // Authorization check
        if (req.user.role !== 'admin' && lead.supplier_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (status) lead.status = status;
        if (notes !== undefined) lead.notes = notes;

        await lead.save();
        res.json(lead);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete a lead from CRM
// @route   DELETE /api/crm/leads/:id
// @access  Private
exports.deleteLead = async (req, res) => {
    try {
        const lead = await CrmLead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // Authorization check
        if (req.user.role !== 'admin' && lead.supplier_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await CrmLead.findByIdAndDelete(req.params.id);
        res.json({ message: 'Lead deleted from CRM' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get Auto-Reply settings for supplier
// @route   GET /api/crm/auto-reply
// @access  Private
exports.getAutoReplySettings = async (req, res) => {
    try {
        const company = await Company.findOne({ user_id: req.user._id });
        if (!company) {
            return res.status(404).json({ message: 'Company profile not found' });
        }

        res.json({
            auto_reply_enabled: company.auto_reply_enabled || false,
            auto_reply_text: company.auto_reply_text || 'Thank you for your message. We will get back to you shortly!'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update Auto-Reply settings for supplier
// @route   PUT /api/crm/auto-reply
// @access  Private
exports.updateAutoReplySettings = async (req, res) => {
    try {
        const { auto_reply_enabled, auto_reply_text } = req.body;
        const company = await Company.findOne({ user_id: req.user._id });

        if (!company) {
            return res.status(404).json({ message: 'Company profile not found' });
        }

        if (auto_reply_enabled !== undefined) company.auto_reply_enabled = auto_reply_enabled;
        if (auto_reply_text !== undefined) company.auto_reply_text = auto_reply_text;

        await company.save();
        res.json({
            auto_reply_enabled: company.auto_reply_enabled,
            auto_reply_text: company.auto_reply_text
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
