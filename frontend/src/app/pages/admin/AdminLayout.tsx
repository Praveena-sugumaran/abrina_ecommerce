import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './AdminLayout.module.css';
import './admin-global.css';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import LogoutModal from '@/components/js/LogoutModal';
import AdminHeader from './AdminHeader';
import { getImgUrl } from '@/utils/imageConfig';

interface AdminSubItem {
    id: string | number;
    label: string;
    path: string;
    icon: string;
}

interface AdminMenuItem {
    id?: string | number;
    label?: string;
    path?: string;
    icon?: string;
    group?: string;
    items?: AdminSubItem[];
}

const DEFAULT_MENU_ITEMS: AdminMenuItem[] = [
    {
        id: "dashboard",
        label: "Dashboard",
        path: "/admin/dashboard",
        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    },
    {
        group: "User Management",
        items: [
            { id: "users", label: "All Users", path: "/admin/users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
            { id: "buyers", label: "Buyers", path: "/admin/buyers", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
            { id: "suppliers", label: "Suppliers", path: "/admin/suppliers", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" },
            { id: "verifications", label: "Company Verification", path: "/admin/verifications", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
            { id: "roles", label: "Role Management", path: "/admin/roles", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
            { id: "permissions", label: "Permission List", path: "/admin/permissions", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.952 11.952 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
            { id: "sub-admins", label: "Sub-Admin Users", path: "/admin/sub-admins", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 010 7.75" }
        ]
    },
    {
        group: "Marketplace",
        items: [
            { id: "orders", label: "Orders", path: "/admin/orders", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
            { id: "products", label: "Products", path: "/admin/products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
            { id: "approvals", label: "Product Approvals", path: "/admin/approvals", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
            { id: "categories", label: "Categories", path: "/admin/categories", icon: "M4 6h16M4 12h16M4 18h16" },
            { id: "custom-fields", label: "Custom Fields", path: "/admin/custom-fields", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
            { id: "disputes", label: "Disputes", path: "/admin/disputes", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }
        ]
    },
    {
        group: "Warehouse Management",
        items: [
            { id: "warehouses", label: "Warehouses", path: "/admin/warehouses", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" },
            { id: "warehouse-inventory", label: "Inventory Status", path: "/admin/warehouses/inventory", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
            { id: "warehouse-transfers", label: "Stock Transfers", path: "/admin/warehouses/transfers", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
            { id: "warehouse-reports", label: "Warehouse Reports", path: "/admin/warehouses/reports", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" }
        ]
    },
    {
        group: "Finance & Analytics",
        items: [
            { id: "revenue", label: "Revenue Analytics", path: "/admin/revenue", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
            { id: "commissions", label: "Commissions & Fees", path: "/admin/commissions", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { id: "withdrawals", label: "Withdrawal Requests", path: "/admin/withdrawals", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { id: "payout-management", label: "Payout Management", path: "/admin/payout-management", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
            { id: "payouts", label: "Payout Settings", path: "/admin/payout-settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
            { id: "payments", label: "Payment Methods", path: "/admin/payment-methods", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
            { id: "tax", label: "Tax Settings", path: "/admin/tax", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" }
        ]
    },
    {
        group: "Content & Design",
        items: [
            { id: "cms", label: "CMS Pages", path: "/admin/cms", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" },
            { id: "blog", label: "Blog Posts", path: "/admin/blog", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
            { id: "homepage", label: "Homepage Layout", path: "/admin/homepage", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
            { id: "hero-banner", label: "Hero Banners", path: "/admin/hero-slides", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" },
            { id: "header-menu", label: "Header Menu", path: "/admin/header", icon: "M4 6h16M4 12h16M4 18h16" },
            { id: "footer", label: "Footer Menu", path: "/admin/footer", icon: "M4 6h16M4 12h16M4 18h16" }
        ]
    },
    {
        group: "Marketing & Operations",
        items: [
            { id: "emi-plans", label: "EMI Plans", path: "/admin/emi-plans", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
            { id: "coupons", label: "Coupons & Promo Codes", path: "/admin/coupons", icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" },
            { id: "gift-cards", label: "Gift Cards", path: "/admin/gift-cards", icon: "M12 8v13m0-13V3.5A1.5 1.5 0 0113.5 2h.178a1.5 1.5 0 011.5 1.5V5h-3m0 3H6.5A1.5 1.5 0 005 6.5v.178A1.5 1.5 0 006.5 8.178H12m0-3.178H6.5" },
            { id: "sale-campaigns", label: "Sale Campaigns", path: "/admin/sale-campaigns", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            { id: "newsletter", label: "Email Campaigns", path: "/admin/newsletter", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
            { id: "subscriptions", label: "Subscriptions", path: "/admin/subscriptions", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 003-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" }
        ]
    },
    {
        group: "System Settings",
        items: [
            { id: "settings", label: "Settings", path: "/admin/settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
            { id: "social", label: "Social Login", path: "/admin/social-login", icon: "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" },
            { id: "email-templates", label: "Email Templates", path: "/admin/email-templates", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
            { id: "logistics", label: "Logistics Rules", path: "/admin/shipping-rules", icon: "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" },
            { id: "countries", label: "Countries", path: "/admin/countries", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { id: "states", label: "States", path: "/admin/states", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" },
            { id: "business-types", label: "Business Types", path: "/admin/business-types", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
            { id: "languages", label: "Languages", path: "/admin/languages", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" },
            { id: "currencies", label: "Currencies", path: "/admin/currencies", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { id: "dummy-data", label: "Dummy Data Reset", path: "/admin/dummy-data", icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }
        ]
    },
    {
        group: "Security & Moderation",
        items: [
            { id: "reviews", label: "Review Management", path: "/admin/reviews", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.246.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.178 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.98 10.1c-.773-.564-.374-1.81.588-1.81h4.908a1 1 0 00.95-.69l1.519-4.674z" },
            { id: "notifications", label: "Notifications", path: "/admin/notifications", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
            { id: "audit", label: "Audit Logs", path: "/admin/audit-logs", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            { id: "device-management", label: "Device Management", path: "/admin/device-management", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" }
        ]
    }
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
    const navigate = useRouter();
    const location = usePathname();
    const { theme, toggleTheme } = useTheme();
    const { user, logout, language, currency, availableLanguages, availableCurrencies, updateUserSettings, siteSettings, isInitialized, t, convertPrice, refreshSiteSettings } = useAuth();

    const ROUTE_PERMISSIONS: { [key: string]: string } = {
        '/admin/warehouses/inventory': 'warehouse.inventory.view',
        '/admin/warehouses/transfers': 'warehouse.transfer.view',
        '/admin/warehouses/reports': 'warehouse.reports.view',
        '/admin/warehouses': 'warehouses.view',
        '/admin/users': 'users.view',
        '/admin/buyers': 'users.view',
        '/admin/suppliers': 'users.view',
        '/admin/verifications': 'users.view',
        '/admin/notifications': 'users.view',
        '/admin/sub-admins': 'users.view',
        '/admin/orders': 'orders.view',
        '/admin/disputes': 'disputes.view',
        '/admin/products': 'products.view',
        '/admin/approvals': 'products.view',
        '/admin/categories': 'products.view',
        '/admin/coupons': 'products.view',
        '/admin/gift-cards': 'products.view',
        '/admin/reviews': 'products.view',
        '/admin/roles': 'roles.view',
        '/admin/permissions': 'permissions.view',
        '/admin/withdrawals': 'reports.view',
        '/admin/payout-management': 'reports.view',
        '/admin/revenue': 'reports.view',
        '/admin/commissions': 'reports.view',
        '/admin/credit': 'reports.view',
        '/admin/settings': 'settings.view',
        '/admin/payment-methods': 'settings.view',
        '/admin/tax': 'settings.view',
        '/admin/cms': 'settings.view',
        '/admin/homepage': 'settings.view',
        '/admin/hero-slides': 'settings.view',
        '/admin/sale-campaigns': 'settings.view',
        '/admin/newsletter': 'settings.view',
        '/admin/blog': 'settings.view',
        '/admin/footer': 'settings.view',
        '/admin/header': 'settings.view',
        '/admin/subscriptions': 'settings.view',
        '/admin/social-login': 'settings.view',
        '/admin/countries': 'settings.view',
        '/admin/shipping-rules': 'settings.view',
        '/admin/states': 'settings.view',
        '/admin/business-types': 'settings.view',
        '/admin/languages': 'settings.view',
        '/admin/currencies': 'settings.view',
        '/admin/live-stream-settings': 'settings.view',
        '/admin/email-settings': 'settings.view',
        '/admin/email-templates': 'settings.view',
        '/admin/dummy-data': 'settings.view',
        '/admin/audit-logs': 'settings.view',
        '/admin/device-management': 'settings.view',
        '/admin/worldwide': 'settings.view'
    };

    const userRoles = user?.roles || (user?.role ? [user?.role] : []);
    const isSuperAdmin = userRoles.includes('admin') && !user?.role_id;

    let hasAccess = true;
    let requiredPermissionName = '';

    if (user && !isSuperAdmin && location !== '/admin/login' && location !== '/admin/dashboard' && location !== '/admin/profile') {
        const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(route =>
            location === route || location.startsWith(route + '/')
        );
        if (matchedRoute) {
            const requiredSlug = ROUTE_PERMISSIONS[matchedRoute];
            const userPerms = user.permissions || [];
            if (!userPerms.includes(requiredSlug)) {
                hasAccess = false;
                requiredPermissionName = requiredSlug;
            }
        }
    }

    const normalizeKey = (label?: string) => {
        if (!label) return '';
        return label.toLowerCase()
            .replace(/ & /g, '_and_')
            .replace(/ /g, '_')
            .replace(/[^a-zA-Z0-9_]/g, '');
    };
    const formatNavLabel = (label?: string) => {
        if (!label) return '';
        if (label.toLowerCase() === 'suppliers' || label.toLowerCase() === 'supplier') return 'Sellers';
        const key = normalizeKey(label);
        const translated = t(key);
        if (!translated || translated === key || translated.includes('_')) {
            return label.replace(/_/g, ' ').replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
        return translated;
    };
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [navItems, setNavItems] = useState<AdminMenuItem[]>(DEFAULT_MENU_ITEMS);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        logout();
        setShowLogoutModal(false);
    };

    const isNavItemActive = (itemPath?: string) => {
        if (!itemPath) return false;
        if (location === itemPath) return true;
        if (itemPath !== '/admin/dashboard' && location?.startsWith(itemPath + '/')) return true;
        return false;
    };

    // Security Check: Only admins allowed
    useEffect(() => {
        if (!isInitialized) return;
        const roles = user?.roles || (user?.role ? [user.role] : []);
        if (!user || !roles.includes('admin')) {
            navigate.push('/admin/login');
        }
    }, [user, navigate, location, isInitialized]);

    useEffect(() => {
        if (!isInitialized || !user) return;
        const roles = user.roles || (user.role ? [user.role] : []);
        if (!roles.includes('admin')) return;

        const fetchData = async () => {
            try {
                const mRes = await api.get('/admin/menu');
                if (Array.isArray(mRes.data) && mRes.data.length > 0) {
                    const merged = DEFAULT_MENU_ITEMS.map(defGroup => {
                        const foundGroup = mRes.data.find((g: any) => g.group === defGroup.group);
                        if (!foundGroup) return defGroup;
                        const existingIds = new Set((foundGroup.items || []).map((i: any) => i.id));
                        const missingItems = (defGroup.items || []).filter(i => !existingIds.has(i.id));
                        return {
                            ...foundGroup,
                            items: [...(foundGroup.items || []), ...missingItems]
                        };
                    });
                    setNavItems(merged);
                }
            } catch (err) {
                console.error('Error fetching layout data:', err);
            }
        };
        fetchData();
    }, [isInitialized, user]);

    const SidebarIcon = ({ path, active }: { path: string; active: boolean }) => (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ minWidth: '20px', flexShrink: 0 }}
        >
            <path d={path} />
        </svg>
    );

    const [licenseCode, setLicenseCode] = useState('');
    const [verifyingLicense, setVerifyingLicense] = useState(false);
    const [licenseError, setLicenseError] = useState('');



    return (
        <div className={`admin-layout ${theme}`}>
            {/* Overlay */}
            {drawerOpen && <div className={styles['admin-overlay']} onClick={() => setDrawerOpen(false)}></div>}

            <aside className={`admin-sidebar border-r border-gray-200 ${isCollapsed ? 'collapsed' : ''} ${drawerOpen ? 'drawer-open' : ''}`}>
                <div className={styles['admin-logo-box']}>
                    <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', transition: 'opacity 0.2s' }}>
                        {siteSettings?.logo_light || siteSettings?.logo_dark || siteSettings?.site_logo ? (
                            <img 
                                src={getImgUrl(siteSettings.logo_light || siteSettings.logo_dark || siteSettings.site_logo)} 
                                alt={siteSettings.site_name || 'B2B Admin'} 
                                style={{ height: '36px', maxWidth: '140px', objectFit: 'contain' }} 
                            />
                        ) : null}
                        {!(siteSettings?.logo_light || siteSettings?.logo_dark || siteSettings?.site_logo) && siteSettings?.site_name && (
                            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--admin-text-main, #0f172a)' }}>
                                {siteSettings.site_name}
                            </span>
                        )}
                    </Link>
                    <button
                        className="admin-collapse-btn"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            {isCollapsed ? <path d="M13 17l5-5-5-5M6 17l5-5-5-5" /> : <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />}
                        </svg>
                    </button>
                </div>

                <div className={styles['admin-nav-content']}>
                    <nav className={styles['admin-sidebar-nav']}>
                        {navItems.map((item, index) => {
                            if (item.group) {
                                return (
                                    <div key={index} className="admin-nav-group-container">
                                        <div className="admin-nav-group">
                                            {!isCollapsed ? (t(normalizeKey(item.group)) || item.group) : '···'}
                                        </div>
                                        {item.items?.filter((sub: AdminSubItem) => 
                                            sub.path !== '/admin/worldwide' && 
                                            sub.path !== '/admin/credit' && 
                                            sub.path !== '/admin/live-stream-settings' && 
                                            sub.path !== '/admin/email-settings' && 
                                            sub.path !== '/admin/features-report' && 
                                            sub.label?.toLowerCase() !== 'worldwide page' && 
                                            sub.label?.toLowerCase() !== 'trade credit approvals' && 
                                            sub.label?.toLowerCase() !== 'live stream settings' && 
                                            sub.label?.toLowerCase() !== 'email settings' && 
                                            sub.label?.toLowerCase() !== 'features list report'
                                        ).map((sub: AdminSubItem) => (
                                            <Link
                                                key={sub.id}
                                                href={sub.path}
                                                className={`admin-nav-item ${isNavItemActive(sub.path) ? 'active' : ''}`}
                                                onClick={() => setDrawerOpen(false)}
                                                title={isCollapsed ? formatNavLabel(sub.label) : ''}
                                            >
                                                <SidebarIcon path={sub.icon} active={isNavItemActive(sub.path)} />
                                                {!isCollapsed && <span>{formatNavLabel(sub.label)}</span>}
                                            </Link>
                                        ))}
                                    </div>
                                );
                            } else {
                                if (
                                    item.path === '/admin/worldwide' || 
                                    item.path === '/admin/credit' || 
                                    item.path === '/admin/live-stream-settings' || 
                                    item.path === '/admin/email-settings' || 
                                    item.path === '/admin/features-report' || 
                                    item.label?.toLowerCase() === 'worldwide page' || 
                                    item.label?.toLowerCase() === 'trade credit approvals' || 
                                    item.label?.toLowerCase() === 'live stream settings' || 
                                    item.label?.toLowerCase() === 'email settings' || 
                                    item.label?.toLowerCase() === 'features list report'
                                ) return null;
                                return (
                                    <Link
                                        key={item.id || index}
                                        href={item.path || '#'}
                                        className={`admin-nav-item ${isNavItemActive(item.path) ? 'active' : ''}`}
                                        onClick={() => setDrawerOpen(false)}
                                        title={isCollapsed ? formatNavLabel(item.label) : ''}
                                    >
                                        <SidebarIcon path={item.icon || ''} active={isNavItemActive(item.path)} />
                                        {!isCollapsed && <span>{formatNavLabel(item.label)}</span>}
                                    </Link>
                                );
                            }
                        })}
                    </nav>
                </div>

                <div className={styles['admin-sidebar-footer']}>
                    <button
                        className="admin-nav-item"
                        onClick={handleLogout}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', marginTop: 0 }}
                        title={isCollapsed ? 'Logout' : ''}
                    >
                        <SidebarIcon
                            path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            active={false}
                        />
                        {!isCollapsed && <span>{t('logout_account') || 'Logout'}</span>}
                    </button>
                </div>
            </aside>

            <main className={styles['admin-main']}>
                <AdminHeader
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                    setDrawerOpen={setDrawerOpen}
                />
                <div className={styles['admin-content-wrapper']}>
                    {hasAccess ? children : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '70vh',
                            padding: '2rem',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                background: 'var(--admin-card-bg, #ffffff)',
                                border: '1px solid var(--admin-border, #e2e8f0)',
                                borderRadius: '24px',
                                padding: '3rem 2rem',
                                maxWidth: '500px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1.5rem'
                                }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                </div>
                                <h2 style={{
                                    fontSize: '24px',
                                    fontWeight: '800',
                                    color: 'var(--admin-text-main, #0d2e67)',
                                    marginBottom: '0.75rem'
                                }}>Access Denied</h2>
                                <p style={{
                                    color: 'var(--admin-text-secondary, #334155)',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    marginBottom: '1.5rem'
                                }}>
                                    You do not have the required permissions (<strong>{requiredPermissionName}</strong>) to access this page. Please contact your system administrator.
                                </p>
                                <button
                                    onClick={() => navigate.push('/admin/dashboard')}
                                    style={{
                                        background: 'var(--primary-color, #0d2e67)',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '10px 24px',
                                        borderRadius: '12px',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 12px rgba(13,46,103,0.2)'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <LogoutModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogout}
                title="Admin Logout"
                message="Are you sure you want to sign out from Admin Panel?"
            />
        </div>
    );
};

export default AdminLayout;
