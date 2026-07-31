const Language = require('../models/Language');
const Currency = require('../models/Currency');
const FooterSection = require('../models/FooterSection');
const Country = require('../models/Country');
const State = require('../models/State');
const HeaderNavigation = require('../models/HeaderNavigation');

// Get all active languages
exports.getLanguages = async (req, res) => {
    try {
        const languages = await Language.find({ is_active: true }).sort('order');
        res.json(languages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get all active currencies
exports.getCurrencies = async (req, res) => {
    try {
        const currencies = await Currency.find({ is_active: true }).sort('order');
        res.json(currencies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get business types
exports.getBusinessTypes = (req, res) => {
    const businessTypes = [
        { label: 'Merchant', value: 'merchant' },
        { label: 'Manufacturer', value: 'manufacturer' },
        { label: 'Wholesaler', value: 'wholesaler' },
        { label: 'Retailer', value: 'retailer' }
    ];
    res.json(businessTypes);
};

// Get countries
exports.getCountries = async (req, res) => {
    try {
        const countries = await Country.find({ status: 'Active' }).sort('name');
        res.json(countries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get states by country
exports.getStates = async (req, res) => {
    try {
        const { countryId } = req.params;
        console.log(`[DEBUG] Fetching states for countryId: ${countryId}`);
        if (!countryId || countryId === 'undefined') {
            return res.status(400).json({ message: 'Valid Country ID is required' });
        }

        const states = await State.find({ country: countryId }).sort('name');
        console.log(`[DEBUG] Found ${states.length} states`);
        res.json(states);
    } catch (err) {
        console.error(`[DEBUG] Error in getStates:`, err);
        res.status(500).json({ message: err.message });
    }
};

// Get footer sections
exports.getFooterSections = async (req, res) => {
    try {
        const sections = await FooterSection.find({ status: { $ne: 'inactive' } }).sort('order');
        res.json(sections);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get header navigations
exports.getHeaderNavigations = async (req, res) => {
    try {
        const links = await HeaderNavigation.find({ status: 'active' }).populate('parent').sort('order');
        res.json(links);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get shipping rules
exports.getShippingRules = async (req, res) => {
    try {
        const ShippingRule = require('../models/ShippingRule');
        const query = { is_active: true };
        if (req.query.country_code) {
            query.country_code = req.query.country_code.toUpperCase();
        }
        const rules = await ShippingRule.find(query);
        res.json(rules);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Calculate shipping
exports.calculateShipping = async (req, res) => {
    try {
        const {
            products,
            dest_country,
            dest_state,
            dest_zip,
            buyer_lat,
            buyer_lng,
            supplier_id,
            quantity,
            product_id
        } = req.body;

        const ShippingRule = require('../models/ShippingRule');
        const Product = require('../models/Product');
        const Company = require('../models/Company');

        // Helper to calculate distance in km using Haversine formula
        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Radius of the earth in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        // 1. Normalize products list
        let normalizedProducts = [];
        if (Array.isArray(products) && products.length > 0) {
            normalizedProducts = products;
        } else if (quantity) {
            normalizedProducts = [{
                productId: product_id || req.body.productId,
                quantity: parseInt(quantity) || 1
            }];
        }

        // 2. Fetch product weights and dimensions from DB and calculate chargeable weight
        const itemsWithDetails = [];
        for (const item of normalizedProducts) {
            const pId = item.productId || item.product_id;
            if (!pId) continue;
            const dbProduct = await Product.findById(pId);
            if (!dbProduct) continue;

            const physicalWeight = dbProduct.weight || 0; // in kg
            let volumetricWeight = 0;
            if (dbProduct.dimensions && dbProduct.dimensions.length && dbProduct.dimensions.width && dbProduct.dimensions.height) {
                volumetricWeight = (dbProduct.dimensions.length * dbProduct.dimensions.width * dbProduct.dimensions.height) / 5000;
            }
            const chargeableWeight = Math.max(physicalWeight, volumetricWeight) || 1.0;

            itemsWithDetails.push({
                productId: dbProduct._id,
                quantity: item.quantity,
                supplier: dbProduct.supplier,
                chargeableWeight: chargeableWeight
            });
        }

        if (itemsWithDetails.length === 0) {
            return res.json({ shipping_methods: [] });
        }

        // 3. Resolve buyer coordinates
        const bLat = parseFloat(buyer_lat || req.body.dest_lat || 0);
        const bLng = parseFloat(buyer_lng || req.body.dest_lng || 0);
        const hasBuyerCoords = bLat !== 0 || bLng !== 0;

        // 4. Resolve unique suppliers and their coordinates
        const suppliersInfo = {};
        for (const item of itemsWithDetails) {
            if (!item.supplier) continue;
            const sIdStr = item.supplier.toString();
            if (!suppliersInfo[sIdStr]) {
                const company = await Company.findOne({ user_id: item.supplier });
                const latVal = company ? parseFloat(company.lat || 0) : 0;
                const lngVal = company ? parseFloat(company.lng || 0) : 0;
                suppliersInfo[sIdStr] = {
                    lat: latVal,
                    lng: lngVal,
                    hasCoords: latVal !== 0 || lngVal !== 0,
                    distance: null
                };
            }
        }

        // Calculate distance for each supplier
        for (const sId in suppliersInfo) {
            const info = suppliersInfo[sId];
            if (hasBuyerCoords && info.hasCoords) {
                info.distance = calculateDistance(info.lat, info.lng, bLat, bLng);
            }
        }

        // 5. Fetch all active shipping rules
        const rules = await ShippingRule.find({ is_active: true });

        // Helper to find fallback country rule for a supplier when distance rule doesn't match
        const findCountryRuleForCountry = (countryCode) => {
            const code = (countryCode || 'US').toUpperCase();
            return rules.find(r => r.type === 'country' && r.country_code === code) ||
                   rules.find(r => r.type === 'country' && r.country_code === 'ALL') ||
                   rules.find(r => r.type === 'country');
        };

        const destCountryCode = (dest_country || 'US').toUpperCase();
        const fallbackCountryRule = findCountryRuleForCountry(destCountryCode);

        // 6. Map through each rule and calculate overall shipping cost
        const result = rules.map(rule => {
            let total_cost = 0;
            let total_distance = 0;
            let count_distances = 0;
            let total_qty = 0;

            // Group items by supplier for calculations
            const supplierWeights = {};
            itemsWithDetails.forEach(item => {
                const sIdStr = item.supplier ? item.supplier.toString() : 'unknown';
                supplierWeights[sIdStr] = (supplierWeights[sIdStr] || 0) + (item.chargeableWeight * item.quantity);
                total_qty += item.quantity;
            });

            const supplierIds = Object.keys(supplierWeights);

            if (rule.type === 'distance') {
                // Distance rule calculation
                for (const sId of supplierIds) {
                    const info = suppliersInfo[sId];
                    const weight = supplierWeights[sId];

                    if (info && info.distance !== null && info.distance >= rule.min_distance && info.distance <= rule.max_distance) {
                        // Apply this distance rule
                        total_cost += rule.base_cost + (info.distance * rule.cost_per_km) + (rule.cost_per_kg * weight);
                        total_distance += info.distance;
                        count_distances++;
                    } else {
                        // Fallback to country rule for this supplier
                        const cRule = fallbackCountryRule || rules.find(r => r.type === 'country');
                        if (cRule) {
                            total_cost += cRule.base_cost + (cRule.cost_per_kg * weight);
                        } else {
                            total_cost += 50 + (5 * weight); // Ultimate fallback
                        }
                    }
                }
            } else {
                // Country rule calculation
                const isApplicableCountry = rule.country_code === destCountryCode || rule.country_code === 'ALL';
                if (!isApplicableCountry) {
                    // Skip country rules that don't match the destination country
                    return null;
                }

                for (const sId of supplierIds) {
                    const weight = supplierWeights[sId];
                    total_cost += rule.base_cost + (rule.cost_per_kg * weight);
                }
            }

            // Calculate average distance if applicable
            const avgDistance = count_distances > 0 ? (total_distance / count_distances) : 0;
            const cost_per_piece = total_qty > 0 ? (total_cost / total_qty) : 0;

            // Delivery windows
            const today = new Date();
            const delivery_start = new Date(today);
            delivery_start.setDate(today.getDate() + rule.estimated_days_min);
            const delivery_end = new Date(today);
            delivery_end.setDate(today.getDate() + rule.estimated_days_max);

            return {
                id: rule._id,
                name: rule.carrier,
                distance: avgDistance > 0 ? avgDistance.toFixed(2) : '0.00',
                total_cost: total_cost.toFixed(2),
                cost_per_piece: cost_per_piece.toFixed(2),
                delivery_range: `${delivery_start.toDateString()} - ${delivery_end.toDateString()}`,
                minDays: rule.estimated_days_min,
                maxDays: rule.estimated_days_max
            };
        }).filter(Boolean); // Remove null rules (e.g. non-matching country rules)

        // Calculate live Courier Rates (DHL, FedEx, UPS)
        let totalWeight = 0;
        itemsWithDetails.forEach(item => {
            totalWeight += item.chargeableWeight * item.quantity;
        });

        const courierService = require('../services/courierService');
        const courierRatesList = courierService.calculateRates(totalWeight, destCountryCode);
        const today = new Date();

        const formattedCourierRates = courierRatesList.map(rate => {
            const delivery_start = new Date(today);
            delivery_start.setDate(today.getDate() + rate.estimated_days);
            const delivery_end = new Date(today);
            delivery_end.setDate(today.getDate() + rate.estimated_days + 2);
            
            return {
                id: `courier_${rate.carrier}`,
                name: rate.name,
                distance: '0.00',
                total_cost: rate.cost.toFixed(2),
                cost_per_piece: (totalWeight > 0 ? (rate.cost / totalWeight) : rate.cost).toFixed(2),
                delivery_range: `${delivery_start.toDateString()} - ${delivery_end.toDateString()}`,
                minDays: rate.estimated_days,
                maxDays: rate.estimated_days + 2,
                carrier: rate.carrier
            };
        });

        // Combine DB rules and live courier rates
        const allMethods = [...result, ...formattedCourierRates];

        // Sort by lowest price
        allMethods.sort((a, b) => parseFloat(a.total_cost) - parseFloat(b.total_cost));

        // Apply free delivery override if SiteSetting allows it
        const SiteSetting = require('../models/SiteSetting');
        const siteSettings = await SiteSetting.findOne();
        const orderTotal = parseFloat(req.body.order_total || 0);
        const freeDeliveryEnabled = siteSettings?.free_delivery_enabled;
        const freeDeliveryThreshold = parseFloat(siteSettings?.free_delivery_threshold || 0);

        if (freeDeliveryEnabled && (freeDeliveryThreshold === 0 || orderTotal >= freeDeliveryThreshold)) {
            allMethods.forEach(m => {
                m.total_cost = '0.00';
                m.cost_per_piece = '0.00';
                m.is_free = true;
            });
        }

        res.json({
            shipping_methods: allMethods,
            free_delivery_active: freeDeliveryEnabled && (freeDeliveryThreshold === 0 || orderTotal >= freeDeliveryThreshold),
            free_delivery_threshold: freeDeliveryThreshold
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get all active trust items
exports.getTrustItems = async (req, res) => {
    try {
        const TrustItem = require('../models/TrustItem');
        const items = await TrustItem.find({ isActive: true }).sort('order');
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get all active partners
exports.getPartners = async (req, res) => {
    try {
        const Partner = require('../models/Partner');
        const items = await Partner.find({ isActive: true }).sort('order');
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Reset and restore database with backup
exports.resetDatabase = async (req, res) => {
    try {
        const resetToken = process.env.DB_RESET_TOKEN || 'reset123';
        if (req.query.token !== resetToken) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please provide the correct token parameter, e.g., ?token=YOUR_TOKEN'
            });
        }

        const fs = require('fs');
        const path = require('path');
        const mongoose = require('mongoose');
        const dummyDataService = require('../services/dummyDataService');

        // 1. Create a local backup of the current database before resetting
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const backupData = {};

        for (const collInfo of collections) {
            const collectionName = collInfo.name;
            // Skip locking/audit/operations/logs collections to keep it light
            if (['mongolocks', 'dummydataoperations', 'dummydataoblogs', 'auditlogs'].includes(collectionName)) {
                continue;
            }
            const collectionData = await db.collection(collectionName).find({}).toArray();
            backupData[collectionName] = collectionData;
        }

        const backupDir = path.join(__dirname, '../storage/backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `auto-backup-before-reset-${dateStr}.json`;
        const filePath = path.join(backupDir, filename);

        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

        // 2. Perform the reset and import
        const logSession = await dummyDataService.importDummyData(null, 'url_trigger');

        res.json({
            success: true,
            message: 'Database backup, reset, and default data import completed successfully.',
            backupFile: `/storage/backups/${filename}`,
            backupLocation: filePath,
            data: logSession
        });
    } catch (err) {
        console.error('Database reset endpoint error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to backup, reset, and import database',
            error: err.message
        });
    }
};

