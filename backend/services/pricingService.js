const Product = require('../models/Product');
const promotionService = require('./promotionService');

class PricingService {
    /**
     * Calculate cart totals by pushing items through the PromotionEngine.
     * @param {Array} items - Array of cart items { productId, quantity, variantOptions }
     * @param {object} userContext - Context for promotion eligibility { id }
     * @returns {object} Calculated cart data
     */
    async calculateCartTotals(items, userContext) {
        let totalCartAmount = 0;
        const calculatedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId).populate('supplier');
            if (!product) continue;

            // 1. Base Price Resolution
            let basePrice = product.main_price;
            if (product.price_tiers?.length > 0) {
                const sortedTiers = [...product.price_tiers].sort((a, b) => a.min_quantity - b.min_quantity);
                for (const tier of sortedTiers) {
                    if (item.quantity >= tier.min_quantity) basePrice = tier.price;
                }
            }
            if (item.variantOptions) {
                Object.entries(item.variantOptions).forEach(([vName, vVal]) => {
                    const v = product.variants?.find(x => x.name === vName && x.value === vVal);
                    if (v?.price_modifier) basePrice += v.price_modifier;
                });
            }

            let finalPrice = basePrice;
            let appliedPromotion = null;

            // 2. Promotion Engine
            const promo = await promotionService.getWinningPromotionForProduct(product._id, userContext);
            if (promo) {
                if (promo.discount_type === 'percentage') {
                    finalPrice = basePrice * (1 - (promo.discount_value / 100));
                } else if (promo.discount_type === 'fixed') {
                    finalPrice = Math.max(0, basePrice - promo.discount_value);
                }
                appliedPromotion = promo;
            }

            const itemSubtotal = finalPrice * item.quantity;
            totalCartAmount += itemSubtotal;

            calculatedItems.push({
                product_id: product._id,
                name: product.name,
                quantity: item.quantity,
                base_price: basePrice,
                final_price: finalPrice,
                subtotal: itemSubtotal,
                promotion: appliedPromotion,
                supplier: product.supplier
            });
        }

        return {
            items: calculatedItems,
            totalCartAmount
        };
    }
}

module.exports = new PricingService();
