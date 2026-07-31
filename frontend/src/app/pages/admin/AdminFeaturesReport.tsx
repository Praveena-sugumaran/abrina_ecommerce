'use client';
import React, { useState } from 'react';
import styles from './AdminFeaturesReport.module.css';

interface FeatureItem {
    name: string;
    category: string;
    status: 'completed' | 'pending';
    notes: string;
}

const FEATURES_DATA: FeatureItem[] = [
    // Customer Features
    { name: "Home Page", category: "Customer Features", status: "completed", notes: "Implemented in Home.tsx & HomepageSections.tsx. Includes hero banner, categories slider, flash deals, and recently viewed." },
    { name: "User Registration", category: "Customer Features", status: "completed", notes: "Implemented in Register.tsx with email verification and role-selection (buyer/seller)." },
    { name: "User Login", category: "Customer Features", status: "completed", notes: "Implemented in Login.tsx with login attempts limit and reCAPTCHA protection." },
    { name: "Social Login", category: "Customer Features", status: "completed", notes: "Implemented in SocialRegister.tsx & socialLoginController.js (Google/Facebook integration)." },
    { name: "User Profile", category: "Customer Features", status: "completed", notes: "Implemented in UserSettings.tsx. Edit personal details, avatar uploads, and password changes." },
    { name: "Account Dashboard", category: "Customer Features", status: "completed", notes: "Implemented in BuyerDashboard.tsx and SupplierDashboard.tsx with statistics & navigation links." },
    { name: "Wishlist", category: "Customer Features", status: "completed", notes: "Implemented in BuyerWishlist.tsx & wishlistRoutes.js. Add to wishlist from search/detail and manage lists." },
    { name: "Shopping Cart", category: "Customer Features", status: "completed", notes: "Implemented in Cart.tsx. Support for multi-supplier splitting, quantity modifiers, and coupon codes." },
    { name: "Checkout", category: "Customer Features", status: "completed", notes: "Implemented in Checkout.tsx & orderController.js with split payment options (Stripe, PayPal, Razorpay)." },
    { name: "Order Tracking", category: "Customer Features", status: "completed", notes: "Implemented in OrderTimeline.tsx and OrderDetail.tsx showing status history updates." },
    { name: "Order History", category: "Customer Features", status: "completed", notes: "Implemented in MyOrders.tsx with sorting, search, and invoice download buttons." },
    { name: "Product Reviews", category: "Customer Features", status: "completed", notes: "Implemented in ReviewModal.tsx & reviewController.js. Add star rating and textual feedback for items." },
    { name: "Product Ratings", category: "Customer Features", status: "completed", notes: "Aggregate rating calculation and star display are integrated inside product review cards." },
    { name: "Product Questions & Answers", category: "Customer Features", status: "completed", notes: "Implemented as a dedicated Q&A tab on ProductDetail.tsx backed by productQaController.js." },
    { name: "Recently Viewed Products", category: "Customer Features", status: "completed", notes: "Tracked in client localStorage and rendered on Homepage & Product Details pages." },
    { name: "Saved Addresses", category: "Customer Features", status: "completed", notes: "Implemented in ShippingAddress.tsx & shippingAddressRoutes.js with primary address settings." },
    { name: "Payment Methods", category: "Customer Features", status: "completed", notes: "Managed in PayoutMethod.tsx / UserSettings.tsx and backend paymentSettingController.js." },
    { name: "Notifications", category: "Customer Features", status: "completed", notes: "Implemented in MyNotifications.tsx & notificationRoutes.js for system alerts." },
    { name: "Coupons & Promo Codes", category: "Customer Features", status: "completed", notes: "Checkout coupon code field and dynamic seller coupon managers are fully implemented." },
    { name: "Loyalty Rewards", category: "Customer Features", status: "completed", notes: "Implemented in BuyerCredit.tsx. Earn loyalty points on purchases and redeem them in checkout." },
    { name: "Coins & Rewards", category: "Customer Features", status: "completed", notes: "Daily login check-in coin accumulation is integrated into the loyalty framework." },
    { name: "Referral Program", category: "Customer Features", status: "completed", notes: "Implemented in ReferralProgram.tsx. Earn points by sharing referral codes, tracked in checkout flow." },
    { name: "Buyer Protection", category: "Customer Features", status: "completed", notes: "Escrow payment system holds funds until delivery confirmation or admin dispute resolution." },
    { name: "Returns & Refunds", category: "Customer Features", status: "completed", notes: "Implemented in BuyerDisputes.tsx and disputeController.js to handle refund claims." },
    { name: "Help Center", category: "Customer Features", status: "completed", notes: "FAQ categories and dynamic chatbot support are fully integrated in Worldwide.tsx." },
    { name: "Customer Support", category: "Customer Features", status: "completed", notes: "Implemented in MyMessages.tsx using real-time Socket.io message center." },
    { name: "Live Chat", category: "Customer Features", status: "completed", notes: "Integrated inside the chat messaging center between buyers and suppliers." },
    { name: "Multi-language", category: "Customer Features", status: "completed", notes: "Locales directory with 24 translation files (EN, AR, ZH, FR, ES, RU, HI, etc.) is fully supported." },
    { name: "Multi-currency", category: "Customer Features", status: "completed", notes: "Header country/currency selector with automatic conversion of exchange rates on product prices." },

    // Product Features
    { name: "Product Categories", category: "Product Features", status: "completed", notes: "Implemented in Categories.tsx & categoryController.js. Add/edit from Admin." },
    { name: "Sub Categories", category: "Product Features", status: "completed", notes: "Parent/child mapping hierarchy is supported in category schemas." },
    { name: "Brand Listing", category: "Product Features", status: "completed", notes: "Product brands and attributes are mapped in search filters and creation forms." },
    { name: "Product Search", category: "Product Features", status: "completed", notes: "Implemented in Search.tsx. Support for text, categories, filters, and sorting." },
    { name: "Advanced Filters", category: "Product Features", status: "completed", notes: "Filters in Search.tsx side-panel (MOQ, Price Range, Supplier, Countries, Ratings)." },
    { name: "Product Sorting", category: "Product Features", status: "completed", notes: "Sort search results by Best Match, Orders count, Reviews rating, Price, and Newest." },
    { name: "Product Comparison", category: "Product Features", status: "completed", notes: "Interactive comparison tray (up to 5 items) and side-by-side spec overlay in Search.tsx." },
    { name: "Product Details", category: "Product Features", status: "completed", notes: "Implemented in ProductDetail.tsx. Displays specs, variants, QA, reviews, and related items." },
    { name: "Product Variants", category: "Product Features", status: "completed", notes: "Multiple variants (Size, Color, Capacity) modify pricing and stock on detail tab." },
    { name: "Product Images", category: "Product Features", status: "completed", notes: "Multi-image uploads and carousel viewer are integrated into product details." },
    { name: "Product Videos", category: "Product Features", status: "pending", notes: "Database product model supports video URLs, but frontend video rendering is missing on detail view." },
    { name: "Product Specifications", category: "Product Features", status: "completed", notes: "Specs table and custom fields configuration tab are fully implemented." },
    { name: "Related Products", category: "Product Features", status: "completed", notes: "Detail page recommendation slider based on matching tags." },
    { name: "Recommended Products", category: "Product Features", status: "completed", notes: "Showcase products sliders on Home Page and Buyer Dashboard." },
    { name: "Flash Deals", category: "Product Features", status: "completed", notes: "Sale campaigns with countdowns on the Home Page deals slider." },
    { name: "Best Sellers", category: "Product Features", status: "completed", notes: "Rankings based on sales volume on Top Ranking page." },
    { name: "New Arrivals", category: "Product Features", status: "completed", notes: "Filtered page query showing products sorted by creation time." },
    { name: "Trending Products", category: "Product Features", status: "completed", notes: "Homepage TrendingProducts.tsx segment displays trending products." },
    { name: "Bundle Offers", category: "Product Features", status: "completed", notes: "Flash deal group campaigns and discount rules are supported." },
    { name: "Daily Deals", category: "Product Features", status: "completed", notes: "SuperDeals dynamic sales block." },

    // Order & Payment Features
    { name: "Secure Checkout", category: "Order & Payment Features", status: "completed", notes: "Stripe, PayPal, and Razorpay payment authorization flows are secure and verified." },
    { name: "Multiple Payment Gateways", category: "Order & Payment Features", status: "completed", notes: "Stripe credit cards, PayPal, Razorpay, Wallet balance, and Net Terms business credit." },
    { name: "Cash on Delivery", category: "Order & Payment Features", status: "completed", notes: "COD selection toggled in checkout, verified on backend order creation." },
    { name: "EMI Payment", category: "Order & Payment Features", status: "pending", notes: "Installment or EMI payment calculations are not implemented in checkout flows." },
    { name: "Wallet Payment", category: "Order & Payment Features", status: "completed", notes: "Wallet top-up in dashboard, balance check, and checkout payment deductions." },
    { name: "Order Confirmation", category: "Order & Payment Features", status: "completed", notes: "Success page confirmations with order receipt IDs and tracking links." },
    { name: "Invoice Download", category: "Order & Payment Features", status: "completed", notes: "Invoice.tsx dynamically builds a printable layout with receipt details." },
    { name: "Shipment Tracking", category: "Order & Payment Features", status: "completed", notes: "Timeline updates showing dispatch, transit, customs, and delivery." },
    { name: "Order Cancellation", category: "Order & Payment Features", status: "completed", notes: "Cancellation requests and refund escrow processing are fully functional." },
    { name: "Return Request", category: "Order & Payment Features", status: "completed", notes: "Initiate return/refund requests from Buyer disputes dashboard." },
    { name: "Refund Management", category: "Order & Payment Features", status: "completed", notes: "Escrow release toggling, admin dispute settling, and refunds payout are fully implemented." },

    // Seller Features
    { name: "Seller Registration", category: "Seller Features", status: "completed", notes: "SellerRegister.tsx handles supplier business onboarding details." },
    { name: "Seller Verification", category: "Seller Features", status: "completed", notes: "Admin verifications dashboard manages supplier license approval processes." },
    { name: "Seller Dashboard", category: "Seller Features", status: "completed", notes: "SupplierDashboard.tsx manages orders, listings, payouts, and ads." },
    { name: "Store Management", category: "Seller Features", status: "completed", notes: "Setup custom store info, banners, and auto-reply configurations." },
    { name: "Product Management", category: "Seller Features", status: "completed", notes: "Add, edit, delete product entries with tier-pricing support." },
    { name: "Inventory Management", category: "Seller Features", status: "completed", notes: "Edit stock metrics and variations options." },
    { name: "Order Management", category: "Seller Features", status: "completed", notes: "SupplierOrders.tsx monitors order states and triggers dispatch." },
    { name: "Shipping Management", category: "Seller Features", status: "completed", notes: "Create customized warehouses, templates, rules, and charges." },
    { name: "Coupon Management", category: "Seller Features", status: "completed", notes: "SupplierCoupons.tsx manages custom store coupons." },
    { name: "Store Analytics", category: "Seller Features", status: "completed", notes: "Daily visitor, revenue analytics, and transaction metrics." },
    { name: "Customer Messages", category: "Seller Features", status: "completed", notes: "Real-time communication center backed by Socket.io." },
    { name: "Seller Ratings", category: "Seller Features", status: "completed", notes: "Average supplier rating visible on directories." },
    { name: "Seller Reviews", category: "Seller Features", status: "completed", notes: "SupplierReviews.tsx keeps track of buyer star reviews." },
    { name: "Store Banner Management", category: "Seller Features", status: "completed", notes: "Customise store banners using the layout builder." },
    { name: "Store Followers", category: "Seller Features", status: "completed", notes: "Track followed count, follow button on directory cards." },

    // Admin Features
    { name: "Admin Dashboard", category: "Admin Features", status: "completed", notes: "AdminDashboard.tsx overview panel showing live counts and charts." },
    { name: "User Management", category: "Admin Features", status: "completed", notes: "AdminUsers.tsx lists, updates, and deletes system users." },
    { name: "Seller Management", category: "Admin Features", status: "completed", notes: "AdminCompanies.tsx manages and verifies seller onboarding profiles." },
    { name: "Product Management", category: "Admin Features", status: "completed", notes: "AdminProducts.tsx manages system products." },
    { name: "Category Management", category: "Admin Features", status: "completed", notes: "AdminCategories.tsx manages categories." },
    { name: "Brand Management", category: "Admin Features", status: "completed", notes: "Brand classifications handled within categories." },
    { name: "Order Management", category: "Admin Features", status: "completed", notes: "AdminOrders.tsx manages orders globally." },
    { name: "Payment Management", category: "Admin Features", status: "completed", notes: "AdminPaymentSettings.tsx manages payment configuration keys." },
    { name: "Commission Management", category: "Admin Features", status: "completed", notes: "AdminCommissions.tsx configures site-wide fees & category margins." },
    { name: "Shipping Management", category: "Admin Features", status: "completed", notes: "AdminShippingRules.tsx & AdminWarehouses.tsx configure shipping rules." },
    { name: "Coupon Management", category: "Admin Features", status: "completed", notes: "AdminCoupons.tsx configures site promotional campaigns." },
    { name: "Banner Management", category: "Admin Features", status: "completed", notes: "AdminHeroSlides.tsx configures dynamic homepage banners." },
    { name: "CMS Management", category: "Admin Features", status: "completed", notes: "AdminCMS.tsx manages static custom pages (About Us, Terms, Privacy Policy)." },
    { name: "Notification Management", category: "Admin Features", status: "completed", notes: "AdminNotifications.tsx allows bulk notifications sending." },
    { name: "Review Management", category: "Admin Features", status: "completed", notes: "ReviewsManagement.tsx monitors and moderates product ratings." },
    { name: "Report Management", category: "Admin Features", status: "completed", notes: "AdminWarehouseReports.tsx exports CSV documents." },
    { name: "Analytics Dashboard", category: "Admin Features", status: "completed", notes: "Visual Doughnut & Line chart analytics using Chart.js." },
    { name: "Tax Management", category: "Admin Features", status: "completed", notes: "AdminTaxManagement.tsx sets tax rules." },
    { name: "Currency Management", category: "Admin Features", status: "completed", notes: "AdminCurrencies.tsx configures site exchange rates." },
    { name: "Language Management", category: "Admin Features", status: "completed", notes: "AdminLanguages.tsx registers active translation tags." },
    { name: "Email Templates", category: "Admin Features", status: "completed", notes: "AdminEmailTemplates.tsx customizes HTML notification styles." },
    { name: "SEO Management", category: "Admin Features", status: "completed", notes: "Custom meta settings." },
    { name: "System Settings", category: "Admin Features", status: "completed", notes: "AdminSettings.tsx controls global variables." },
    { name: "Role & Permission Management", category: "Admin Features", status: "completed", notes: "AdminRoles.tsx & AdminPermissions.tsx manage user access groups." },
    { name: "Audit Logs", category: "Admin Features", status: "completed", notes: "AdminAuditLogs.tsx tracks actions taken on the dashboard." },

    // Marketing Features
    { name: "Homepage Banners", category: "Marketing Features", status: "completed", notes: "Sliders are dynamic, fully editable in Admin." },
    { name: "Promotional Campaigns", category: "Marketing Features", status: "completed", notes: "SupplierCampaigns.tsx lets vendors create PPC promotions." },
    { name: "Flash Sale Management", category: "Marketing Features", status: "completed", notes: "AdminCampaigns.tsx sets up super flash sale deals." },
    { name: "Featured Products", category: "Marketing Features", status: "completed", notes: "Product list items can be set as featured slider entries." },
    { name: "Personalized Recommendations", category: "Marketing Features", status: "completed", notes: "Slider based on user's local recently viewed list." },
    { name: "Affiliate Program", category: "Marketing Features", status: "completed", notes: "Campaign referral codes track click counts and payouts." },
    { name: "Email Marketing", category: "Marketing Features", status: "pending", notes: "Transactional templates exist, but bulk mail campaign execution is missing." },
    { name: "Push Notifications", category: "Marketing Features", status: "pending", notes: "In-app and browser socket notifications are complete, but FCM push is not integrated." },
    { name: "SMS Notifications", category: "Marketing Features", status: "pending", notes: "SMS gateway API integration is missing." },
    { name: "Social Media Sharing", category: "Marketing Features", status: "pending", notes: "Social media sharing widgets on product pages are not implemented." },
    { name: "Cross Selling", category: "Marketing Features", status: "completed", notes: "Related Products tab displayed on detail views." },
    { name: "Upselling", category: "Marketing Features", status: "completed", notes: "Showcase recommendations sliders." },

    // Shipping Features
    { name: "Shipping Zones", category: "Shipping Features", status: "completed", notes: "Warehouse zones customizable by countries." },
    { name: "Shipping Methods", category: "Shipping Features", status: "completed", notes: "Custom methods (Air Cargo, Sea, Express) with rules." },
    { name: "Shipping Charges", category: "Shipping Features", status: "completed", notes: "Calculated based on weight & zone parameters during checkout." },
    { name: "Free Shipping", category: "Shipping Features", status: "completed", notes: "Free shipping rules are supported in shipping templates." },
    { name: "Delivery Estimation", category: "Shipping Features", status: "completed", notes: "Estimated lead times shown on checkout page." },
    { name: "Shipment Tracking", category: "Shipping Features", status: "completed", notes: "Timeline updates shown in order details page." },
    { name: "Warehouse Management", category: "Shipping Features", status: "completed", notes: "AdminWarehouses.tsx and AdminWarehouseInventory.tsx manage warehouses." },

    // Security Features
    { name: "OTP Verification", category: "Security Features", status: "completed", notes: "Email OTP verification codes during registration and logins." },
    { name: "Email Verification", category: "Security Features", status: "completed", notes: "Verified email tags exist in authorization contexts." },
    { name: "Mobile Verification", category: "Security Features", status: "completed", notes: "SMS OTP code verification flow using simulated secure 6-digit codes. Managed in SecuritySettings.tsx." },
    { name: "Two-Factor Authentication", category: "Security Features", status: "completed", notes: "Email OTP-based 2FA togglable in SecuritySettings.tsx." },
    { name: "SSL Security", category: "Security Features", status: "completed", notes: "System routing configured over SSL." },
    { name: "Fraud Detection", category: "Security Features", status: "completed", notes: "AdminFraud.tsx dashboard checks for suspicious users." },
    { name: "Login History", category: "Security Features", status: "completed", notes: "Audit logs log all login success/failures." },
    { name: "Device Management", category: "Security Features", status: "pending", notes: "Multi-device logins or browser session termination is not implemented." },

    // Additional Features
    { name: "Mobile Responsive Design", category: "Additional Features", status: "completed", notes: "Fully mobile responsive UI elements using Next.js." },
    { name: "PWA Support", category: "Additional Features", status: "pending", notes: "No progressive web app service workers or manifest configuration files exist." },
    { name: "Dark Mode", category: "Additional Features", status: "completed", notes: "ThemeContext.tsx toggles theme on Admin and Supplier Dashboards. Pending for main client storefront." },
    { name: "AI Search", category: "Additional Features", status: "completed", notes: "AiSourcing.tsx AI Sourcing Agent refines queries and matches suppliers using Gemini." },
    { name: "Voice Search", category: "Additional Features", status: "completed", notes: "VoiceSearchContext.tsx integrates speech-to-text directly in the header." },
    { name: "Recently Viewed", category: "Additional Features", status: "completed", notes: "Saves product views in client localStorage for quick retrieval." },
    { name: "Frequently Bought Together", category: "Additional Features", status: "pending", notes: "No automatic product bundling recommendations on details panel." },
    { name: "Back in Stock Notification", category: "Additional Features", status: "pending", notes: "No out-of-stock alert subscription capability." },
    { name: "Out of Stock Management", category: "Additional Features", status: "completed", notes: "Out of stock badge displays, disabling checkout add actions." },
    { name: "Gift Cards", category: "Additional Features", status: "pending", notes: "Gift card code credits are not implemented." },
    { name: "Gift Wrapping", category: "Additional Features", status: "pending", notes: "No checkout wrapping choices." },
    { name: "Newsletter Subscription", category: "Additional Features", status: "pending", notes: "UI block commented out / removed from footer." },
    { name: "Blog Management", category: "Additional Features", status: "pending", notes: "SQL table structure exists, but Mongoose schemas/controllers are missing." },
    { name: "FAQ Management", category: "Additional Features", status: "completed", notes: "CMS static templates support FAQs." },
    { name: "Contact Us / About Us", category: "Additional Features", status: "completed", notes: "Page views handled via CMS custom pages." },
    { name: "Terms & Conditions", category: "Additional Features", status: "completed", notes: "CMS page configuration." },
    { name: "Privacy Policy", category: "Additional Features", status: "completed", notes: "CMS page configuration." }
];

const AdminFeaturesReport = () => {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('pending');

    // Calculate dynamic stats
    const totalCount = FEATURES_DATA.length;
    const completedCount = FEATURES_DATA.filter(f => f.status === 'completed').length;
    const pendingCount = totalCount - completedCount;
    const completionRate = Math.round((completedCount / totalCount) * 100);

    // Extract unique categories for filter
    const categories = ['All', ...Array.from(new Set(FEATURES_DATA.map(f => f.category)))];

    // Filter features
    const filteredFeatures = FEATURES_DATA.filter(feature => {
        const matchesSearch = feature.name.toLowerCase().includes(search.toLowerCase()) || 
                              feature.notes.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || feature.category === selectedCategory;
        const matchesStatus = selectedStatus === 'All' || feature.status === selectedStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <div className={styles.container}>
            {/* Header banner */}
            <div className={styles.welcome}>
                <div className={styles.welcomeText}>
                    <h1>AliExpress Features List Report</h1>
                    <p>Track implemented vs pending features across Customer, Seller, Admin, and Security categories.</p>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#e0f2fe', color: '#0284c7' }}>📋</div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Total Features</span>
                        <span className={styles.statValue}>{totalCount}</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>✓</div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Completed</span>
                        <span className={styles.statValue}>{completedCount}</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#ffe4e6', color: '#e11d48' }}>⌛</div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Pending</span>
                        <span className={styles.statValue}>{pendingCount}</span>
                    </div>
                </div>

                {/* Completion Progress Card */}
                <div className={`${styles.statCard} ${styles.statProgressCard}`}>
                    <div className={styles.progressHeader}>
                        <span className={styles.progressLabel}>Overall Completion</span>
                        <span className={styles.progressPercent}>{completionRate}%</span>
                    </div>
                    <div className={styles.progressBarContainer}>
                        <div className={styles.progressBar} style={{ width: `${completionRate}%` }} />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filtersCard}>
                <div className={styles.searchWrapper}>
                    <svg className={styles.searchIcon} width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input 
                        type="text" 
                        placeholder="Search features or files..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                        className={styles.searchInput}
                    />
                </div>

                <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={styles.selectInput}
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <select 
                    value={selectedStatus} 
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className={styles.selectInput}
                >
                    <option value="All">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                </select>
            </div>

            {/* Features Table */}
            <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                    <h3>Features List Report ({filteredFeatures.length})</h3>
                    <p>Details and files locations mapping for AliExpress features list.</p>
                </div>

                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Feature Name</th>
                                <th>Status</th>
                                <th>Implementation / Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeatures.length > 0 ? (
                                filteredFeatures.map((feat, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <span className={styles.categoryBadge}>{feat.category}</span>
                                        </td>
                                        <td>
                                            <span className={styles.featureName}>{feat.name}</span>
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${feat.status === 'completed' ? styles.statusCompleted : styles.statusPending}`}>
                                                <span className={styles.statusDot} />
                                                {feat.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.notesCell}>{feat.notes}</div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4}>
                                        <div className={styles.emptyState}>
                                            <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                            </svg>
                                            <h4>No features found</h4>
                                            <p>Try refining your search query or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminFeaturesReport;
