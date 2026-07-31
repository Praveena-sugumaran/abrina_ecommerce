# Pending & Partial Features Development Report

This report outlines the remaining development tasks for the AliExpress-style B2C marketplace platform, categorizing each feature by status, describing key requirements, and providing estimated completion times.

---

## Executive Summary
* **Total Remaining Features**: 13
* **Development Type**: 7 Pending (unimplemented), 6 Partial (requires enhancement)
* **Total Estimated Effort**: 117 Hours (~15 Business Days)
* **Target Objective**: Complete the core B2C retail experience, marketing tools, notifications layer, and system security.

---

## Detailed Features Register

| Category | Feature Name | Status | Requirements & Scope | Est. Hours |
| :--- | :--- | :--- | :--- | :---: |
| **Orders** | Return & Exchange | **Partial** | Extend the disputes schema and resolution interface to allow item replacement options. | 8 |
| **Product** | Digital Downloads | **Pending** | Add secure storage, link generation, and purchase validation routes for virtual products. | 12 |
| **Product** | Barcode Fields | **Pending** | Database schema additions for UPC/EAN barcodes and layout rendering on detail pages. | 4 |
| **Product** | Video Showcase | **Partial** | Implement secure video uploads in seller profiles and add video players in product views. | 6 |
| **Logistics** | Courier API Integration | **Pending** | Integrate FedEx/DHL/UPS API carriers for dynamic rates and automatic shipping label generation. | 16 |
| **Notifications** | SMS Gateway (OTP) | **Partial** | Connect Twilio or alternative SMS API providers to send phone authentication codes. | 8 |
| **Notifications** | FCM Push Alerts | **Pending** | Integrate Firebase Cloud Messaging to send browser and dashboard push notifications. | 10 |
| **Marketing** | Bought Together Panel | **Pending** | Develop data recommendation models showing co-purchased items in checkout views. | 10 |
| **Marketing** | Email Campaign Panel | **Pending** | Admin interface supporting HTML email templates editing and bulk customer mailing. | 12 |
| **Marketing** | Newsletter Dispatcher | **Partial** | Automated compilation and email template dispatcher utilizing the active subscriber registry. | 5 |
| **Security** | Two-Factor Auth (2FA) | **Pending** | Time-based One-time Password (TOTP) auth for admin and seller panel dashboards. | 8 |
| **Mobile** | Barcode Scanner | **Pending** | HTML5 camera/barcode reader library integration within the search header. | 6 |
| **Extra** | Gift Cards & Wrapping | **Pending** | Checkout options supporting digital gift certificates, wrapper pricing adjustments, and custom notes. | 12 |

---

## Implementation Roadmap

```
Phase 1: Transaction & Logistics (36 Hours)
├─ Dispute Exchange Upgrades ────────────────── [8 Hours]
├─ Courier API Integrations ─────────────────── [16 Hours]
└─ Product Video & Uploads ──────────────────── [12 Hours]

Phase 2: Security & Notifications (36 Hours)
├─ Two-Factor Authentication (2FA) ─────────── [8 Hours]
├─ Twilio SMS & FCM Push Alerts ────────────── [18 Hours]
└─ Newsletter & Mail Campaign Panel ────────── [10 Hours]

Phase 3: Conversions & Extras (45 Hours)
├─ Digital Downloads ────────────────────────── [12 Hours]
├─ Bought Together Association Panel ───────── [10 Hours]
├─ Barcode & Camera Scanner ────────────────── [10 Hours]
└─ Gift Wrapping & Gift Cards ───────────────── [13 Hours]
```
