const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');

// Load env vars
dotenv.config({ override: true });

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    message: 'Too many requests'
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit login/register to 20 per hour
    message: 'Too many attempts. Please try again after an hour.'
});

const app = express();
app.set('trust proxy', 1); // Trust all proxies (Cloudflare, Nginx, etc.)

// CORS Middleware
const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:3000";
const allowedOrigins = rawOrigins.split(',').map(url => url.trim());

app.use(cors({
    origin: function (origin, callback) {
        // Allow all origins in development or explicitly check
        // To prevent 500 errors on frontend IPs
        callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
}));

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" }
}));
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/send-otp', authLimiter);

const server = http.createServer(app);

// Middleware
app.use('/api/webhook', require('./routes/webhookRoutes')); // Must be before express.json()
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const checkClientLicense = require('./middlewares/licenseMiddleware');
app.use(checkClientLicense);

const maintenanceMiddleware = require('./middlewares/maintenanceMiddleware');
app.use(maintenanceMiddleware);

app.use('/api/install', require('./routes/installRoutes'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/search', express.static(path.join(__dirname, 'uploads/search')));
app.use('/uploads/worldwide', express.static(path.join(__dirname, 'uploads/worldwide')));
app.use('/documentation', express.static(path.join(__dirname, '../documentation')));

// Proxy prefix fallbacks for /api/uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads/search', express.static(path.join(__dirname, 'uploads/search')));
app.use('/api/uploads/worldwide', express.static(path.join(__dirname, 'uploads/worldwide')));
app.use('/api/documentation', express.static(path.join(__dirname, '../documentation')));

const startServer = async () => {
    try {
        // 🔒 File Integrity Check: Detect manual modification of critical license verification files
        try {
            const crypto = require('crypto');
            const fs = require('fs');
            const path = require('path');

            const expectedHashes = {
                'services/licenseService.js': '510fc82151b4c32ca93011bb8849233be78bacf73ed95ff22b9453bff986096d',
                'middlewares/licenseMiddleware.js': '898c836bb1db39c25b50548ccd6f7f0899a7c10128cc9afd1bb6319c79ae0f12'
            };

            for (const [relativePath, expectedHash] of Object.entries(expectedHashes)) {
                const filePath = path.join(__dirname, relativePath);
                if (!fs.existsSync(filePath)) {
                    throw new Error(`Critical license verification file missing: ${relativePath}`);
                }
                const content = fs.readFileSync(filePath);
                const hash = crypto.createHash('sha256').update(content).digest('hex');
                if (hash !== expectedHash) {
                    throw new Error(`Security Exception: Manual modification of critical license verification file detected (${relativePath}). Processing aborted.`);
                }
            }
            console.log('🔒 License file integrity verification passed.');
        } catch (integrityErr) {
            console.error('🔥 CRITICAL SECURITY ALERT:', integrityErr.message);
            process.exit(1); // Force terminate the process
        }

        // Connect to database
        await connectDB();

        // Run startup license domain verification
        try {
            const { verifyDomainOnStartup } = require('./services/licenseService');
            await verifyDomainOnStartup();
        } catch (licenseErr) {
            console.error('Failed to execute startup license verification check:', licenseErr.message);
        }

        // Check if database needs first-time initialization/import
        try {
            const User = require('./models/User');
            const count = await User.countDocuments();
            if (count === 0) {
                console.log('First-time initialization detected. Running automatic import of b2b_backup.json...');
                const dummyDataService = require('./services/dummyDataService');
                await dummyDataService.importDummyData(null, 'cli');
                console.log('Automatic first-time import completed successfully.');
            }
        } catch (initErr) {
            console.error('Failed to run automatic first-time data import:', initErr);
        }

        const { initSocket, setIO } = require('./socket/socketHandler');
        const io = await initSocket(server);
        setIO(io);
        app.set('io', io);
        app.use((req, res, next) => {
            req.io = io;
            next();
        });

        // Health Check
        app.get('/api/health', (req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV }));

        // Routes
        app.use('/api/admin', require('./routes/admin/adminRoutes'));
        app.use('/api/auth', require('./routes/authRoutes'));
        app.use('/api/categories', require('./routes/categoryRoutes'));
        app.use('/api/custom-fields', require('./routes/customFieldRoutes'));
        app.use('/api/ai', require('./routes/aiRoutes'));
        app.use('/api/products', require('./routes/productRoutes'));
        app.use('/api/supplier', require('./routes/supplierRoutes'));
        app.use('/api/rfq', require('./routes/rfqRoutes'));
        app.use('/api/tenders', require('./routes/tenderRoutes'));
        app.use('/api/product-qa', require('./routes/productQaRoutes'));
        app.use('/api/orders', require('./routes/orderRoutes'));
        app.use('/api/ads', require('./routes/adRoutes'));
        app.use('/api/emi', require('./routes/emiRoutes'));
        app.use('/api/gift-cards', require('./routes/giftCardRoutes'));
        app.use('/api/credit', require('./routes/businessCreditRoutes'));
        app.use('/api/coupons', require('./routes/couponRoutes'));
        app.use('/api/campaigns', require('./routes/campaignRoutes'));
        app.use('/api/crm', require('./routes/crmRoutes'));
        app.use('/api/inquiries', require('./routes/inquiryRoutes'));
        app.use('/api/customizations', require('./routes/customizationRoutes'));
        app.use('/api/product-enquiries', require('./routes/enquiryRoutes'));
        app.use('/api/company', require('./routes/companyRoutes'));
        app.use('/api/wishlist', require('./routes/wishlistRoutes'));
        app.use('/api/reviews', require('./routes/reviewRoutes'));
        app.use('/api/disputes', require('./routes/disputeRoutes'));
        app.use('/api/billing-address', require('./routes/billingAddressRoutes'));
        app.use('/api/shipping-address', require('./routes/shippingAddressRoutes'));
        app.use('/api/chat', require('./routes/chatRoutes'));
        app.use('/api/subscription-plans', require('./routes/subscriptionPlanRoutes'));
        app.use('/api/cms', require('./routes/cmsRoutes'));
        app.use('/api/notifications', require('./routes/notificationRoutes'));
        app.use('/api/stock-notifications', require('./routes/stockNotificationRoutes'));
        app.use('/api/newsletter', require('./routes/newsletterRoutes'));
        app.use('/api/settings/sms', require('./routes/smsRoutes'));
        app.use('/api/blog', require('./routes/blogRoutes'));
        app.use('/api/tax', require('./routes/taxRoutes'));
        app.use('/api/worldwide', require('./routes/worldwideRoutes'));
        app.use('/api/common', require('./routes/commonRoutes'));
        app.use('/api/commissions', require('./routes/commissionRoutes'));
        app.use('/api/hero-slides', require('./routes/heroSlideRoutes'));
        app.use('/api/sale-campaigns', require('./routes/saleCampaignRoutes'));
        app.use('/api/homepage-sections', require('./routes/admin/homepageSectionRoutes'));
        app.use('/api/live-streams', require('./routes/liveStreamRoutes'));
        app.use('/api/warehouses', require('./routes/warehouseRoutes'));

        // Public social login config
        app.get('/api/test-cors', (req, res) => res.send('CORS and server are updated!'));
        const { getSocialLoginPublic } = require('./controllers/socialLoginController');
        app.get('/api/social-login/public', getSocialLoginPublic);

        // Public payment methods config
        const { getPaymentMethodsPublic } = require('./controllers/paymentSettingController');
        app.get('/api/payment-methods/public', getPaymentMethodsPublic);

        // Public site settings (for frontend to load primary color etc)
        const { getSiteSettingsPublic } = require('./controllers/admin/siteSettingController');
        app.get('/api/site-settings/public', getSiteSettingsPublic);

        // Global Error Handler for Logging
        app.use((err, req, res, next) => {
            const fs = require('fs');
            const logMsg = `${new Date().toISOString()} | ${req.method} ${req.originalUrl} | Error: ${err.message}\nStack: ${err.stack}\n\n`;
            fs.appendFileSync('error.log', logMsg);
            console.error('🔥 GLOBAL ERROR CAUGHT:', err);
            res.status(500).json({ error: 'Internal Server Error', details: err.message });
        });

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

            // Run system maintenance on start and daily
            const { runMaintenance } = require('./services/maintenanceService');
            runMaintenance();
            setInterval(runMaintenance, 24 * 60 * 60 * 1000);

            // ⏰ Daily Demo Reset Cron Scheduler
            const { startCronScheduler, startLicenseHeartbeat } = require('./cron/scheduler');
            startCronScheduler();
            startLicenseHeartbeat();

            // 🚀 Start Background Job Processor (Queue)
            if (process.env.QUEUE_CONNECTION === 'database') {
                const { processJobs } = require('./services/queueService');
                console.log('📦 Queue system enabled (database)');
                setInterval(processJobs, 60 * 1000); // Check every minute
            }
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
};

startServer();
// Reload trigger: connect to primary shard-00-02 direct connection (port cleared)
