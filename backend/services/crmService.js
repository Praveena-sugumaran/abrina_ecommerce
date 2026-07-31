const CrmLead = require('../models/CrmLead');

/**
 * Capture or update a supplier's CRM lead
 * @param {string|mongoose.Types.ObjectId} supplierId - ID of the supplier
 * @param {string|mongoose.Types.ObjectId} buyerId - ID of the buyer
 * @returns {Promise<void>}
 */
exports.touchLead = async (supplierId, buyerId) => {
    try {
        if (!supplierId || !buyerId) return;
        if (supplierId.toString() === buyerId.toString()) return;

        await CrmLead.findOneAndUpdate(
            { supplier_id: supplierId, buyer_id: buyerId },
            { 
                $setOnInsert: { status: 'New' },
                $set: { last_contact_date: new Date() }
            },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error('Error touching CRM lead:', err);
    }
};
