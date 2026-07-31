const Product = require('../models/Product');
const Order = require('../models/Order');

exports.getSupplierStats = async (req, res) => {
    try {
        const supplierId = req.user._id;

        // 1. Basic Counts
        const productCount = await Product.countDocuments({ supplier: supplierId });
        const orders = await Order.find({ supplier_id: supplierId, payment_status: 'paid' });
        const totalRevenue = orders.reduce((sum, ord) => sum + (ord.total_amount || 0), 0);
        const orderCount = orders.length;

        // 2. Conversion Rate (Orders / Total Views)
        const products = await Product.find({ supplier: supplierId });
        const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
        const conversionRate = totalViews > 0 ? ((orderCount / totalViews) * 100).toFixed(2) : 0;

        // 3. Inquiry Stats (B2B deprecated)
        const totalQuotes = 0;
        const acceptedQuotes = 0;
        const quoteWinRate = 0;

        // 4. Monthly Revenue Data (Last 6 months)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const monthlyRevenue = months.map((m, i) => {
            // Simulated data for demo, except current month
            if (i === 3) return totalRevenue; // April
            return 500 + (i * 200);
        });

        res.json({
            summary: {
                products: productCount,
                revenue: totalRevenue,
                orders: orderCount,
                views: totalViews,
                conversionRate: `${conversionRate}%`,
                quoteWinRate: `${quoteWinRate}%`
            },
            charts: {
                revenue: {
                    labels: months,
                    data: monthlyRevenue
                }
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
