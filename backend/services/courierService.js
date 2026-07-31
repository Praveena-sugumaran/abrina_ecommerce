/**
 * Courier Service Stub
 * Simulates third-party logistics API integrations (FedEx, DHL, UPS)
 */

const CARRIER_RATES = {
    dhl: { base: 15.0, per_kg: 8.0, name: 'DHL Express' },
    fedex: { base: 20.0, per_kg: 10.0, name: 'FedEx Priority' },
    ups: { base: 18.0, per_kg: 9.0, name: 'UPS Ground' }
};

/**
 * Calculates live estimated shipping rates based on weight and carrier
 * @param {number} weight - Weight in kg
 * @param {string} countryCode - Destination country code (e.g. US, DE)
 * @returns {Array} List of rates per carrier
 */
exports.calculateRates = (weight = 0.5, countryCode = 'US') => {
    // Basic weight adjustment
    const w = Math.max(0.1, weight);
    
    return Object.entries(CARRIER_RATES).map(([key, config]) => {
        let cost = config.base + (w * config.per_kg);
        
        // Remote area surcharge simulation for certain countries
        if (!['US', 'CA', 'GB', 'DE', 'FR', 'CN'].includes(countryCode.toUpperCase())) {
            cost += 10.0;
        }

        return {
            carrier: key,
            name: config.name,
            cost: parseFloat(cost.toFixed(2)),
            estimated_days: key === 'dhl' ? 3 : key === 'fedex' ? 2 : 5
        };
    });
};

/**
 * Generates mock tracking numbers following standard carrier formats
 * @param {string} carrier - carrier key ('dhl', 'fedex', 'ups')
 * @returns {string} Tracking number
 */
exports.generateTrackingNumber = (carrier = 'dhl') => {
    const randDigits = (len) => Math.floor(Math.pow(10, len-1) + Math.random() * Math.pow(10, len-1) * 9).toString();
    
    switch (carrier.toLowerCase()) {
        case 'fedex':
            return `400${randDigits(9)}`; // 12-digit FedEx format
        case 'ups':
            return `1Z${randDigits(6)}03${randDigits(8)}`; // UPS format
        case 'dhl':
        default:
            return `DHL${randDigits(10)}`; // DHL format
    }
};

/**
 * Generates clean HTML layout buffer for a shipping label
 * @param {Object} order - Order document
 * @param {string} carrier - Carrier name
 * @param {string} trackingNumber - Tracking number
 * @returns {string} HTML content
 */
exports.generateShippingLabelHtml = (order, carrier, trackingNumber) => {
    const addr = order.shipping_address || {};
    const itemsText = order.order_items.map(item => `${item.name} x${item.quantity}`).join(', ');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Shipping Label - Order #${order._id}</title>
        <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 20px; color: #000; }
            .label-card { width: 380px; border: 4px solid #000; padding: 16px; background: #fff; box-sizing: border-box; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            .carrier-name { font-size: 24px; font-weight: 900; text-transform: uppercase; }
            .pkg-info { font-size: 11px; text-align: right; }
            .section { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
            .addr-block { font-size: 13px; line-height: 1.3; }
            .barcode-area { text-align: center; padding: 12px 0; border-bottom: 2px solid #000; margin-bottom: 12px; }
            .barcode-lines { display: inline-block; width: 300px; height: 60px; background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 6px); }
            .tracking-id { font-size: 16px; font-weight: bold; margin-top: 6px; letter-spacing: 2px; }
            .footer-info { font-size: 9px; line-height: 1.2; word-wrap: break-word; }
        </style>
    </head>
    <body>
        <div class="label-card">
            <div class="header">
                <div class="carrier-name">${carrier}</div>
                <div class="pkg-info">
                    <strong>WT:</strong> ${(order.order_items.length * 0.5).toFixed(1)} KG<br>
                    <strong>ID:</strong> #${String(order._id).slice(-8).toUpperCase()}
                </div>
            </div>
            
            <div class="section">
                <div class="title">SHIP FROM:</div>
                <div class="addr-block">
                    PREMIA GLOBAL SELLER HUB<br>
                    Warehouse District B, Suite 100<br>
                    Guangdong, CN
                </div>
            </div>

            <div class="section">
                <div class="title">SHIP TO:</div>
                <div class="addr-block">
                    <strong>${addr.fullName || 'Customer'}</strong><br>
                    ${addr.addressLine || 'Street Address'}<br>
                    ${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}<br>
                    <strong>${addr.country || 'US'}</strong>
                </div>
            </div>

            <div class="barcode-area">
                <div class="barcode-lines"></div>
                <div class="tracking-id">${trackingNumber}</div>
            </div>

            <div class="footer-info">
                <strong>ITEMS:</strong> ${itemsText.slice(0, 80)}...<br>
                <strong>METHOD:</strong> B2C STANDARD DISPATCH<br>
                ${order.gift_wrap?.selected ? `<strong>🎁 GIFT WRAP REQUIRED</strong><br>` : ''}
                ${order.gift_message ? `<strong>GIFT MESSAGE:</strong> "${order.gift_message}"<br>` : ''}
                <em>Escrow Payment Confirmed. System Label Verified.</em>
            </div>
        </div>
    </body>
    </html>
    `;
};
