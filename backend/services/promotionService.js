const Promotion = require('../models/Promotion');
const PromotionProduct = require('../models/PromotionProduct');
const PromotionUsage = require('../models/PromotionUsage');

/**
 * Service to handle promotion eligibility and rules.
 */
class PromotionService {
    
    /**
     * Get the single winning promotion for a specific product based on priority and rules.
     * @param {string} productId 
     * @param {object} userContext - Current user context { id, ... }
     * @returns {object|null} The winning promotion object or null
     */
    async getWinningPromotionForProduct(productId, userContext = null) {
        try {
            // Find active mappings for this product
            const mappings = await PromotionProduct.find({ product: productId }).populate('promotion');
            
            if (!mappings || mappings.length === 0) return null;

            const now = new Date();
            let validPromotions = [];

            for (const map of mappings) {
                const promo = map.promotion;
                if (!promo) continue;

                // Check lifecycle and dates
                if (promo.lifecycle_state !== 'Active') continue;
                if (promo.start_date && new Date(promo.start_date) > now) continue;
                if (promo.end_date && new Date(promo.end_date) < now) continue;

                // Evaluate JSON rules
                const rules = promo.rules || {};
                
                // 1. User Type rule
                if (rules.userType === 'NEW') {
                    if (!userContext || !userContext.id) continue;
                    // Check if they have ANY past completed orders (simplified check, would ideally check Order model)
                    const Order = require('../models/Order');
                    const pastOrdersCount = await Order.countDocuments({ user: userContext.id, paymentStatus: 'paid' });
                    if (pastOrdersCount > 0) continue;
                }

                // 2. Max per customer rule
                if (rules.maxPerCustomer && userContext && userContext.id) {
                    const usageCount = await PromotionUsage.countDocuments({ promotion: promo._id, user: userContext.id });
                    if (usageCount >= rules.maxPerCustomer) continue;
                }

                // Append priority (override from mapping if exists)
                const priority = map.priority !== null ? map.priority : promo.priority;
                validPromotions.push({ promo, priority });
            }

            if (validPromotions.length === 0) return null;

            // Sort by highest priority
            validPromotions.sort((a, b) => b.priority - a.priority);

            return validPromotions[0].promo;

        } catch (err) {
            console.error('Error in PromotionService.getWinningPromotionForProduct:', err);
            return null;
        }
    }

    /**
     * Helper to log promotion usage after a successful checkout.
     * @param {string} promotionId 
     * @param {string} userId 
     * @param {string} orderId 
     */
    async logPromotionUsage(promotionId, userId, orderId) {
        if (!promotionId || !userId || !orderId) return;
        await PromotionUsage.create({
            promotion: promotionId,
            user: userId,
            order: orderId
        });
    }
}

module.exports = new PromotionService();
