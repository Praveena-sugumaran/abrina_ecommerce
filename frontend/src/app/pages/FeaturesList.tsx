'use client';
import React, { useState } from 'react';
import styles from './FeaturesList.module.css';

interface FeatureItem {
    name: string;
    category: string;
    status: 'completed' | 'roadmap';
    desc: string;
    icon: string;
}

const PUBLIC_FEATURES: FeatureItem[] = [
    // Customer Features
    { name: "Home Page", category: "Customer Features", status: "completed", desc: "Vibrant and interactive homepage featuring Hero banners, flash deals, categories, and recently viewed sliders.", icon: "🏠" },
    { name: "User Registration", category: "Customer Features", status: "completed", desc: "Seamless onboarding for buyers and sellers with email verification.", icon: "📝" },
    { name: "User Login", category: "Customer Features", status: "completed", desc: "Secure account access with brute-force protection and reCAPTCHA.", icon: "🔑" },
    { name: "Social Login", category: "Customer Features", status: "completed", desc: "One-click login integration using Facebook and Google accounts.", icon: "🌐" },
    { name: "User Profile", category: "Customer Features", status: "completed", desc: "Manage personal contact details, passwords, and custom avatars.", icon: "👤" },
    { name: "Account Dashboard", category: "Customer Features", status: "completed", desc: "Comprehensive client area highlighting orders, credits, and messages.", icon: "📊" },
    { name: "Wishlist", category: "Customer Features", status: "completed", desc: "Save products to personal shopping lists for quick access and tracking.", icon: "❤️" },
    { name: "Shopping Cart", category: "Customer Features", status: "completed", desc: "Support for adding items, adjusting quantities, and grouping items by supplier.", icon: "🛒" },
    { name: "Checkout", category: "Customer Features", status: "completed", desc: "Secure payment gateway supporting credit cards, PayPal, and digital wallets.", icon: "💳" },
    { name: "Order Tracking", category: "Customer Features", status: "completed", desc: "Live shipment stages tracking with detailed chronological milestone logs.", icon: "📍" },
    { name: "Order History", category: "Customer Features", status: "completed", desc: "Manage past receipts, write product feedback, and download invoices.", icon: "📜" },
    { name: "Product Reviews", category: "Customer Features", status: "completed", desc: "Upload product feedback with written commentary and rating parameters.", icon: "⭐" },
    { name: "Product Ratings", category: "Customer Features", status: "completed", desc: "Real-time aggregate calculations shown on product listings.", icon: "📈" },
    { name: "Product Q&A", category: "Customer Features", status: "completed", desc: "Dedicated discussion boards for asking and answering questions directly on detail views.", icon: "💬" },
    { name: "Recently Viewed", category: "Customer Features", status: "completed", desc: "Quick-retrieve list of recently visited items cached in local storage.", icon: "👁️" },
    { name: "Saved Addresses", category: "Customer Features", status: "completed", desc: "Save multiple shipping address logs to facilitate faster checkout.", icon: "📮" },
    { name: "Payment Methods", category: "Customer Features", status: "completed", desc: "Save payment details and top-up digital wallet balances safely.", icon: "🏦" },
    { name: "Notifications", category: "Customer Features", status: "completed", desc: "In-app and header notifications keeping users informed on order states.", icon: "🔔" },
    { name: "Coupons & Promo Codes", category: "Customer Features", status: "completed", desc: "Checkout discount coupon codes and store-specific promotions support.", icon: "🏷️" },
    { name: "Loyalty Rewards", category: "Customer Features", status: "completed", desc: "Earn loyalty credit points on orders and apply them as direct savings during checkout.", icon: "🎁" },
    { name: "Coins & Rewards", category: "Customer Features", status: "completed", desc: "Gamified coin collections from daily login check-ins.", icon: "🪙" },
    { name: "Referral Program", category: "Customer Features", status: "completed", desc: "Share unique referral link codes to earn loyalty points when new users check out.", icon: "🔗" },
    { name: "Buyer Protection", category: "Customer Features", status: "completed", desc: "Secure escrow payment holding funds until order arrival confirmation.", icon: "🛡️" },
    { name: "Returns & Refunds", category: "Customer Features", status: "completed", desc: "Open disputes and return requests with automated refund settlements.", icon: "🔄" },
    { name: "Help Center", category: "Customer Features", status: "completed", desc: "Interactive customer service chatbot and categorized FAQ lookup.", icon: "ℹ️" },
    { name: "Customer Support", category: "Customer Features", status: "completed", desc: "Direct messages communication with the store support team.", icon: "🤝" },
    { name: "Live Chat", category: "Customer Features", status: "completed", desc: "Real-time chat messaging channels between buyers and suppliers.", icon: "🗣️" },
    { name: "Multi-language", category: "Customer Features", status: "completed", desc: "Full interface translation support across 24 different languages.", icon: "🔤" },
    { name: "Multi-currency", category: "Customer Features", status: "completed", desc: "Real-time price conversions between global currencies like USD, EUR, INR.", icon: "💲" },

    // Product Features
    { name: "Product Categories", category: "Product Features", status: "completed", desc: "Multi-level department categories grouping items (e.g. electronics, apparel).", icon: "📁" },
    { name: "Sub Categories", category: "Product Features", status: "completed", desc: "Recursive hierarchy grouping items into specific micro-departments.", icon: "📂" },
    { name: "Brand Listing", category: "Product Features", status: "completed", desc: "Filter items by manufacturing brand names during searches.", icon: "🏷️" },
    { name: "Product Search", category: "Product Features", status: "completed", desc: "Advanced indexing for text matches, tags, categories, and specifications.", icon: "🔍" },
    { name: "Advanced Filters", category: "Product Features", status: "completed", desc: "Refine listing by country, price, MOQ, and ratings.", icon: "⚙️" },
    { name: "Product Sorting", category: "Product Features", status: "completed", desc: "Sort listings by order volume, rating, price, and publication date.", icon: "↕️" },
    { name: "Product Comparison", category: "Product Features", status: "completed", desc: "Select and compare technical specifications side-by-side.", icon: "⚖️" },
    { name: "Product Details", category: "Product Features", status: "completed", desc: "Detailed specs lists, variants picker, Q&A, and reviews.", icon: "📄" },
    { name: "Product Variants", category: "Product Features", status: "completed", desc: "Choose different options (sizes, colors, packages) dynamically updating price.", icon: "🎨" },
    { name: "Product Images", category: "Product Features", status: "completed", desc: "Multi-angle photo upload capability with built-in viewer slider.", icon: "📷" },
    { name: "Product Videos", category: "Product Features", status: "completed", desc: "Showcase promotional video clips on detail pages.", icon: "🎥" },
    { name: "Product Specifications", category: "Product Features", status: "completed", desc: "Technical datasheet logs showing material details.", icon: "⚙️" },
    { name: "Related Products", category: "Product Features", status: "completed", desc: "Recommended similar items based on tag similarity matches.", icon: "🧩" },
    { name: "Recommended Products", category: "Product Features", status: "completed", desc: "Personalized suggestions displayed on the client home dashboard.", icon: "💡" },
    { name: "Flash Deals", category: "Product Features", status: "completed", desc: "Limited-time deals lists displaying active countdown clocks.", icon: "⚡" },
    { name: "Best Sellers", category: "Product Features", status: "completed", desc: "Curated lists of highly popular items based on orders volume.", icon: "🏆" },
    { name: "New Arrivals", category: "Product Features", status: "completed", desc: "Filtered showcase listing recently uploaded products.", icon: "✨" },
    { name: "Trending Products", category: "Product Features", status: "completed", desc: "Visual showcase cards of high-demand items.", icon: "🔥" },
    { name: "Bundle Offers", category: "Product Features", status: "completed", desc: "Group discounts and promotional package codes.", icon: "📦" },
    { name: "Daily Deals", category: "Product Features", status: "completed", desc: "Revolving promotions changing every 24 hours.", icon: "☀️" },

    // Order & Payment Features
    { name: "Secure Checkout", category: "Order & Payment Features", status: "completed", desc: "Encrypted credit card handling and verification links.", icon: "🔒" },
    { name: "Multiple Payment Gateways", category: "Order & Payment Features", status: "completed", desc: "Choose Stripe, PayPal, Razorpay, Net Terms, or Wallet.", icon: "💸" },
    { name: "Cash on Delivery", category: "Order & Payment Features", status: "completed", desc: "Select COD to pay upon courier arrival.", icon: "🚚" },
    { name: "EMI Payment", category: "Order & Payment Features", status: "completed", desc: "Installment payment structures for high-value orders.", icon: "🗓️" },
    { name: "Wallet Payment", category: "Order & Payment Features", status: "completed", desc: "Recharge personal wallet balances and execute instant checkout payouts.", icon: "👛" },
    { name: "Order Confirmation", category: "Order & Payment Features", status: "completed", desc: "Post-checkout confirmation page showing order receipt status.", icon: "✓" },
    { name: "Invoice Download", category: "Order & Payment Features", status: "completed", desc: "Download and print complete invoices containing billing breakdowns.", icon: "🖨️" },
    { name: "Shipment Tracking", category: "Order & Payment Features", status: "completed", desc: "Timeline updates showing courier handling stages.", icon: "📬" },
    { name: "Order Cancellation", category: "Order & Payment Features", status: "completed", desc: "Cancel unpaid orders or open refund disputes.", icon: "❌" },
    { name: "Return Request", category: "Order & Payment Features", status: "completed", desc: "Submit dispute return request log forms to get pre-paid labels.", icon: "🔄" },
    { name: "Refund Management", category: "Order & Payment Features", status: "completed", desc: "Automated wallet and card refunds handling upon resolution.", icon: "💰" },

    // Seller Features
    { name: "Seller Registration", category: "Seller Features", status: "completed", desc: "Onboarding form for corporate manufacturers to sign up.", icon: "💼" },
    { name: "Seller Verification", category: "Seller Features", status: "completed", desc: "Checklist for corporate validation and license approvals.", icon: "🛡️" },
    { name: "Seller Dashboard", category: "Seller Features", status: "completed", desc: "Central seller control panels summarizing traffic and orders.", icon: "📊" },
    { name: "Store Management", category: "Seller Features", status: "completed", desc: "Customize layouts, logo designs, and store descriptions.", icon: "🏪" },
    { name: "Product Management", category: "Seller Features", status: "completed", desc: "Upload catalog items with tier-pricing calculations.", icon: "🏷️" },
    { name: "Inventory Management", category: "Seller Features", status: "completed", desc: "Adjust available stock numbers and variance definitions.", icon: "📦" },
    { name: "Order Management", category: "Seller Features", status: "completed", desc: "Track buyer purchases, update shipping numbers, and print receipts.", icon: "📋" },
    { name: "Shipping Management", category: "Seller Features", status: "completed", desc: "Configure dispatch warehouses and zone shipping rules.", icon: "🚚" },
    { name: "Coupon Management", category: "Seller Features", status: "completed", desc: "Create custom follow-discounts or coupon code rules.", icon: "🏷️" },
    { name: "Store Analytics", category: "Seller Features", status: "completed", desc: "View detailed statistics on daily clicks and conversions.", icon: "📈" },
    { name: "Customer Messages", category: "Seller Features", status: "completed", desc: "Direct communications inbox with real-time updates.", icon: "📥" },
    { name: "Seller Ratings", category: "Seller Features", status: "completed", desc: "Visual supplier score rating inside searches.", icon: "⭐" },
    { name: "Seller Reviews", category: "Seller Features", status: "completed", desc: "Collect customer feedback to build store reputability.", icon: "📝" },
    { name: "Store Banner Management", category: "Seller Features", status: "completed", desc: "Upload and decorate storefront slideshow banners.", icon: "🖼️" },
    { name: "Store Followers", category: "Seller Features", status: "completed", desc: "Track subscriber count to schedule custom follower campaigns.", icon: "👥" },

    // Admin Features
    { name: "Admin Dashboard", category: "Admin Features", status: "completed", desc: "Overview cards listing system signups, GMV metrics, and revenue charts.", icon: "🖥️" },
    { name: "User Management", category: "Admin Features", status: "completed", desc: "Manage registered credentials and login statuses.", icon: "👥" },
    { name: "Seller Management", category: "Admin Features", status: "completed", desc: "Moderate supplier business entities and verifications.", icon: "🏢" },
    { name: "Product Management", category: "Admin Features", status: "completed", desc: "Moderate system-wide products lists.", icon: "🏷️" },
    { name: "Category Management", category: "Admin Features", status: "completed", desc: "Add or edit platform category tags.", icon: "📁" },
    { name: "Order Management", category: "Admin Features", status: "completed", desc: "Moderate transactions, refunds, and dispute logs.", icon: "📜" },
    { name: "Payment Management", category: "Admin Features", status: "completed", desc: "Configure gateway API credentials for the platform.", icon: "💳" },
    { name: "Commission Management", category: "Admin Features", status: "completed", desc: "Configure admin fees and category margin cuts.", icon: "✂️" },
    { name: "Shipping Management", category: "Admin Features", status: "completed", desc: "Configure platform warehouses and rules.", icon: "🚚" },
    { name: "CMS Management", category: "Admin Features", status: "completed", desc: "Edit site-wide layout blocks, terms, and guidelines.", icon: "🖋️" },
    { name: "SEO Management", category: "Admin Features", status: "completed", desc: "Manage platform search engine indexing tags.", icon: "🔍" },
    { name: "System Settings", category: "Admin Features", status: "completed", desc: "Edit email configurations and theme variables.", icon: "⚙️" },
    { name: "Role & Permission Management", category: "Admin Features", status: "completed", desc: "Configure admin permissions hierarchies.", icon: "🔑" },
    { name: "Audit Logs", category: "Admin Features", status: "completed", desc: "Review trace logs showing changes made by admins.", icon: "🪵" },

    // Marketing Features
    { name: "Homepage Banners", category: "Marketing Features", status: "completed", desc: "Promote key discounts via homepage banners.", icon: "🖼️" },
    { name: "Promotional Campaigns", category: "Marketing Features", status: "completed", desc: "Allow sellers to bid on keyword ad campaigns.", icon: "📣" },
    { name: "Flash Sale Management", category: "Marketing Features", status: "completed", desc: "Admin control tools to schedule flash deals campaigns.", icon: "⚡" },
    { name: "Featured Products", category: "Marketing Features", status: "completed", desc: "Highlighted products showcases.", icon: "⭐" },
    { name: "Personalized Recommendations", category: "Marketing Features", status: "completed", desc: "Display suggestions based on user views history.", icon: "💡" },
    { name: "Affiliate Program", category: "Marketing Features", status: "completed", desc: "Allow partners to generate tracking links to earn commission payouts.", icon: "🤝" },
    { name: "Email Marketing", category: "Marketing Features", status: "completed", desc: "Bulk newsletters campaign dispatch tool.", icon: "✉️" },
    { name: "Push Notifications", category: "Marketing Features", status: "completed", desc: "FCM browser push notification triggers.", icon: "🔔" },
    { name: "SMS Notifications", category: "Marketing Features", status: "completed", desc: "SMS transactional and campaign alerts.", icon: "📱" },
    { name: "Social Media Sharing", category: "Marketing Features", status: "completed", desc: "Share buttons mapped to popular social sites.", icon: "📢" },

    // Shipping Features
    { name: "Shipping Zones", category: "Shipping Features", status: "completed", desc: "Define geographic zones to apply specific tax/shipping fees.", icon: "🗺️" },
    { name: "Shipping Methods", category: "Shipping Features", status: "completed", desc: "Setup express, standard, or sea logistics channels.", icon: "✈️" },
    { name: "Shipping Charges", category: "Shipping Features", status: "completed", desc: "Automatic weight/destination calculations.", icon: "💵" },
    { name: "Free Shipping", category: "Shipping Features", status: "completed", desc: "Promotional free shipping templates.", icon: "🆓" },
    { name: "Delivery Estimation", category: "Shipping Features", status: "completed", desc: "Live lead time estimates shown at checkout.", icon: "⏳" },
    { name: "Shipment Tracking", category: "Shipping Features", status: "completed", desc: "Logistics status mapping.", icon: "📍" },
    { name: "Warehouse Management", category: "Shipping Features", status: "completed", desc: "Admin/Supplier warehouse inventory tracking.", icon: "🏢" },

    // Security Features
    { name: "OTP Verification", category: "Security Features", status: "completed", desc: "Email OTP verification codes during registration.", icon: "📧" },
    { name: "Email Verification", category: "Security Features", status: "completed", desc: "Onboarding email validation check.", icon: "✓" },
    { name: "Mobile Verification", category: "Security Features", status: "completed", desc: "SMS OTP verification flows managed inside account Security Settings.", icon: "📱" },
    { name: "Two-Factor Authentication", category: "Security Features", status: "completed", desc: "Toggle email-based login 2FA verification code settings.", icon: "🛡️" },
    { name: "SSL Security", category: "Security Features", status: "completed", desc: "Secure sockets layer encryption protocols.", icon: "🔒" },
    { name: "Fraud Detection", category: "Security Features", status: "completed", desc: "Flag accounts and monitor duplicate applications.", icon: "🚨" },
    { name: "Login History", category: "Security Features", status: "completed", desc: "Keep track of login locations in audit logs.", icon: "🪵" },
    { name: "Device Management", category: "Security Features", status: "completed", desc: "Session tracking lists.", icon: "💻" },

    // Additional Features
    { name: "Mobile Responsive", category: "Additional Features", status: "completed", desc: "Vibrant layouts adapted to screen parameters.", icon: "📱" },
    { name: "PWA Support", category: "Additional Features", status: "completed", desc: "Progressive web app download caching.", icon: "📲" },
    { name: "Dark Mode", category: "Additional Features", status: "completed", desc: "Theme toggle configurations inside admin/supplier dashboards.", icon: "🌙" },
    { name: "AI Search", category: "Additional Features", status: "completed", desc: "Ask the AI Sourcing assistant to find items and generate specifications.", icon: "🤖" },
    { name: "Voice Search", category: "Additional Features", status: "completed", desc: "Microphone speech-to-text input inside the header.", icon: "🎙️" },
    { name: "Recently Viewed", category: "Additional Features", status: "completed", desc: "Locally saved browser item list logs.", icon: "👁️" },
    { name: "Frequently Bought Together", category: "Additional Features", status: "completed", desc: "Bundle items selection panels.", icon: "🛍️" },
    { name: "Back in Stock Alert", category: "Additional Features", status: "completed", desc: "Email alerts for out-of-stock items.", icon: "🔔" },
    { name: "Out of Stock Management", category: "Additional Features", status: "completed", desc: "Status visibility, disables add-to-cart clicks.", icon: "⚠️" },
    { name: "Gift Cards", category: "Additional Features", status: "completed", desc: "Credit code allocations.", icon: "🎁" },
    { name: "Gift Wrapping", category: "Additional Features", status: "completed", desc: "Choose wrapping custom choices.", icon: "🎀" },
    { name: "Newsletter Subscription", category: "Additional Features", status: "completed", desc: "Subscribe blocks for marketing news.", icon: "✉️" },
    { name: "Blog Management", category: "Additional Features", status: "completed", desc: "Corporate article posting board.", icon: "✍️" },
    { name: "FAQ Management", category: "Additional Features", status: "completed", desc: "Categorized static FAQ pages.", icon: "❓" }
];

const FeaturesList = () => {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('roadmap');

    // Extract categories
    const categories = ['All', ...Array.from(new Set(PUBLIC_FEATURES.map(f => f.category)))];

    // Filter features list
    const filtered = PUBLIC_FEATURES.filter(feat => {
        const matchesSearch = feat.name.toLowerCase().includes(search.toLowerCase()) || 
                              feat.desc.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || feat.category === selectedCategory;
        const matchesStatus = selectedStatus === 'All' || feat.status === selectedStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <div className={styles.container}>
            {/* Hero Header */}
            <div className={styles.hero}>
                <span className={styles.heroTag}>Platform Capabilities</span>
                <h1>Marketplace Features Directory</h1>
                <p>Explore the full list of capabilities integrated into our B2C eCommerce platform. Review what features are live or planned in our development roadmap.</p>
            </div>

            {/* Controls: Search, Status, and Categories */}
            <div className={styles.controls}>
                <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '780px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <div className={styles.searchBox} style={{ flex: 1, minWidth: '260px', maxWidth: 'none' }}>
                        <svg className={styles.searchIcon} width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Search marketplace capabilities..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            className={styles.searchInput}
                        />
                    </div>
                    <select 
                        value={selectedStatus} 
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className={styles.selectInput}
                    >
                        <option value="All">All Features</option>
                        <option value="completed">Live Features</option>
                        <option value="roadmap">Roadmap (Pending)</option>
                    </select>
                </div>

                <div className={styles.tabsContainer}>
                    <div className={styles.tabs}>
                        {categories.map(cat => {
                            const count = cat === 'All' 
                                ? PUBLIC_FEATURES.filter(f => selectedStatus === 'All' || f.status === selectedStatus).length 
                                : PUBLIC_FEATURES.filter(f => f.category === cat && (selectedStatus === 'All' || f.status === selectedStatus)).length;
                            return (
                                <button 
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`${styles.tab} ${selectedCategory === cat ? styles.tabActive : ''}`}
                                >
                                    {cat}
                                    <span className={styles.tabCount}>{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Cards Grid */}
            <div className={styles.grid}>
                {filtered.length > 0 ? (
                    filtered.map((feat, idx) => (
                        <div key={idx} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.iconWrap}>
                                    {feat.icon}
                                </div>
                                <span className={`${styles.badge} ${feat.status === 'completed' ? styles.badgeCompleted : styles.badgeRoadmap}`}>
                                    {feat.status === 'completed' ? '✓ Live' : '⌛ Roadmap'}
                                </span>
                            </div>
                            <div className={styles.cardBody}>
                                <h3>{feat.name}</h3>
                                <p>{feat.desc}</p>
                            </div>
                            <div className={styles.cardCategory}>
                                {feat.category}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <h3>No capabilities found</h3>
                        <p>No features match your query. Try clearing your filters or typing a different search keyword.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeaturesList;
