const HomepageSection = require('../../models/HomepageSection');

// Generic sections config
const DEFAULT_SECTIONS = [
    { id_name: 'hero_banner', title: 'Global B2B Marketplace', subtitle: '', order: 1, is_active: true, data: {} },
    { id_name: 'categories', title: 'Browse Categories', subtitle: 'Explore thousands of products by category', order: 2, is_active: true, data: {} },
    { id_name: 'trending_products', title: 'Trending Products', subtitle: 'Most popular items people are sourcing right now', order: 3, is_active: true, data: {} },
    { id_name: 'featured_suppliers', title: 'Featured Suppliers', subtitle: 'Verified manufacturers & trusted global suppliers', order: 4, is_active: true, data: {} },
    { id_name: 'showcase_products', title: 'Premium Showcase Products', subtitle: 'Handpicked by top-verified suppliers', order: 5, is_active: true, data: {} },
    { id_name: 'shop_by_brand', title: 'Shop By Brand', subtitle: 'Top international labels & verified brand inventory', order: 6, is_active: true, data: {
        brands: [
            { name: 'Apple', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@11.12.0/icons/apple.svg', description: 'Innovative tech devices' },
            { name: 'Samsung', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@11.12.0/icons/samsung.svg', description: 'Global hardware leader' },
            { name: 'Nike', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@11.12.0/icons/nike.svg', description: 'Premium active sportswear' },
            { name: 'Adidas', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@11.12.0/icons/adidas.svg', description: 'Sport performance gears' },
            { name: 'Sony', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@11.12.0/icons/sony.svg', description: 'Digital cameras & audio' }
        ]
    } },
    { id_name: 'industry_section', title: 'Shop by Industry', subtitle: 'Curated product collections across top industries', order: 7, is_active: true, data: {} },
    { id_name: 'rfq_section', title: 'Request for Quotation', subtitle: '', order: 8, is_active: true, data: {} },
    { id_name: 'why_choose_us', title: 'Why Choose Us', subtitle: 'The most trusted B2B marketplace built for global trade', order: 9, is_active: true, data: {} },
    { id_name: 'app_promo', title: 'Mobile App', subtitle: 'Trade on the Go with Our Mobile App', order: 10, is_active: true, data: { image: '/uploads/homepage/mobile_app_promo_combined.png' } }
];

const getSections = async (req, res) => {
    try {
        let sections = await HomepageSection.find().sort({ order: 1 });
        if (sections.length === 0) {
            sections = await HomepageSection.insertMany(DEFAULT_SECTIONS);
        } else {
            // Check if any default section is missing in db and add it dynamically
            const existingIds = new Set(sections.map(s => s.id_name));
            const missing = DEFAULT_SECTIONS.filter(d => !existingIds.has(d.id_name));
            if (missing.length > 0) {
                const inserted = await HomepageSection.insertMany(missing);
                sections = [...sections, ...inserted].sort((a, b) => a.order - b.order);
            }
        }

        // Auto-fix wikimedia/wikipedia links for brand logos in database in place
        const brandSec = sections.find(s => s.id_name === 'shop_by_brand');
        if (brandSec && brandSec.data && brandSec.data.brands) {
            let updated = false;
            const updatedBrands = brandSec.data.brands.map(brand => {
                if (brand.logo.includes('wikipedia') || brand.logo.includes('wikimedia')) {
                    updated = true;
                    if (brand.name.toLowerCase() === 'apple') brand.logo = 'https://cdn.jsdelivr.net/npm/simple-icons@11.12.0/icons/apple.svg';
                    if (brand.name.toLowerCase() === 'samsung') brand.logo = 'https://cdn.jsdelivr.net/npm/simple-icons@11.12.0/icons/samsung.svg';
                    if (brand.name.toLowerCase() === 'nike') brand.logo = 'https://cdn.jsdelivr.net/npm/simple-icons@11.12.0/icons/nike.svg';
                    if (brand.name.toLowerCase() === 'adidas') brand.logo = 'https://cdn.jsdelivr.net/npm/simple-icons@11.12.0/icons/adidas.svg';
                    if (brand.name.toLowerCase() === 'sony') brand.logo = 'https://cdn.jsdelivr.net/npm/simple-icons@11.12.0/icons/sony.svg';
                }
                return brand;
            });
            if (updated) {
                brandSec.data.brands = updatedBrands;
                brandSec.markModified('data');
                await brandSec.save();
            }
        }

        res.json(sections);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateSectionsOrder = async (req, res) => {
    try {
        const { orderedIds } = req.body;
        for (let i = 0; i < orderedIds.length; i++) {
            await HomepageSection.findByIdAndUpdate(orderedIds[i], { order: i + 1 });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const toggleSection = async (req, res) => {
    try {
        const section = await HomepageSection.findById(req.params.id);
        if (!section) return res.status(404).json({ message: 'Not found' });
        section.is_active = !section.is_active;
        await section.save();
        res.json(section);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateSectionContent = async (req, res) => {
    try {
        const section = await HomepageSection.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(section);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getSections,
    updateSectionsOrder,
    toggleSection,
    updateSectionContent
};
