const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Country = require('../models/Country');
const Language = require('../models/Language');
const Currency = require('../models/Currency');

dotenv.config();

const countries = [
    { name: 'India', code: 'IN', dial_code: '+91', flag: '🇮🇳', currency: 'INR', language_code: 'hi' },
    { name: 'United States', code: 'US', dial_code: '+1', flag: '🇺🇸', currency: 'USD', language_code: 'en' },
    { name: 'United Kingdom', code: 'GB', dial_code: '+44', flag: '🇬🇧', currency: 'GBP', language_code: 'en' },
    { name: 'China', code: 'CN', dial_code: '+86', flag: '🇨🇳', currency: 'CNY', language_code: 'zh' },
    { name: 'Germany', code: 'DE', dial_code: '+49', flag: '🇩🇪', currency: 'EUR', language_code: 'de' },
    { name: 'France', code: 'FR', dial_code: '+33', flag: '🇫🇷', currency: 'EUR', language_code: 'fr' },
    { name: 'Japan', code: 'JP', dial_code: '+81', flag: '🇯🇵', currency: 'JPY', language_code: 'ja' },
    { name: 'Canada', code: 'CA', dial_code: '+1', flag: '🇨🇦', currency: 'CAD', language_code: 'en' },
    { name: 'Australia', code: 'AU', dial_code: '+61', flag: '🇦🇺', currency: 'AUD', language_code: 'en' },
    { name: 'Brazil', code: 'BR', dial_code: '+55', flag: '🇧🇷', currency: 'BRL', language_code: 'pt' },
    { name: 'South Korea', code: 'KR', dial_code: '+82', flag: '🇰🇷', currency: 'KRW', language_code: 'ko' },
    { name: 'Mexico', code: 'MX', dial_code: '+52', flag: '🇲🇽', currency: 'MXN', language_code: 'es' },
    { name: 'Italy', code: 'IT', dial_code: '+39', flag: '🇮🇹', currency: 'EUR', language_code: 'it' },
    { name: 'Spain', code: 'ES', dial_code: '+34', flag: '🇪🇸', currency: 'EUR', language_code: 'es' },
    { name: 'Russia', code: 'RU', dial_code: '+7', flag: '🇷🇺', currency: 'RUB', language_code: 'ru' },
    { name: 'Saudi Arabia', code: 'SA', dial_code: '+966', flag: '🇸🇦', currency: 'SAR', language_code: 'ar' },
    { name: 'United Arab Emirates', code: 'AE', dial_code: '+971', flag: '🇦🇪', currency: 'AED', language_code: 'ar' },
    { name: 'Singapore', code: 'SG', dial_code: '+65', flag: '🇸🇬', currency: 'SGD', language_code: 'en' },
    { name: 'Malaysia', code: 'MY', dial_code: '+60', flag: '🇲🇾', currency: 'MYR', language_code: 'ms' },
    { name: 'Indonesia', code: 'ID', dial_code: '+62', flag: '🇮🇩', currency: 'IDR', language_code: 'id' },
    { name: 'Thailand', code: 'TH', dial_code: '+66', flag: '🇹🇭', currency: 'THB', language_code: 'th' },
    { name: 'Vietnam', code: 'VN', dial_code: '+84', flag: '🇻🇳', currency: 'VND', language_code: 'vi' },
    { name: 'Pakistan', code: 'PK', dial_code: '+92', flag: '🇵🇰', currency: 'PKR', language_code: 'ur' },
    { name: 'Bangladesh', code: 'BD', dial_code: '+880', flag: '🇧🇩', currency: 'BDT', language_code: 'bn' },
    { name: 'Nigeria', code: 'NG', dial_code: '+234', flag: '🇳🇬', currency: 'NGN', language_code: 'en' },
    { name: 'South Africa', code: 'ZA', dial_code: '+27', flag: '🇿🇦', currency: 'ZAR', language_code: 'en' },
    { name: 'Egypt', code: 'EG', dial_code: '+20', flag: '🇪🇬', currency: 'EGP', language_code: 'ar' },
    { name: 'Turkey', code: 'TR', dial_code: '+90', flag: '🇹🇷', currency: 'TRY', language_code: 'tr' },
    { name: 'Netherlands', code: 'NL', dial_code: '+31', flag: '🇳🇱', currency: 'EUR', language_code: 'nl' },
    { name: 'Sweden', code: 'SE', dial_code: '+46', flag: '🇸🇪', currency: 'SEK', language_code: 'sv' },
    { name: 'Switzerland', code: 'CH', dial_code: '+41', flag: '🇨🇭', currency: 'CHF', language_code: 'de' },
    { name: 'Poland', code: 'PL', dial_code: '+48', flag: '🇵🇱', currency: 'PLN', language_code: 'pl' },
    { name: 'New Zealand', code: 'NZ', dial_code: '+64', flag: '🇳🇿', currency: 'NZD', language_code: 'en' },
    { name: 'Portugal', code: 'PT', dial_code: '+351', flag: '🇵🇹', currency: 'EUR', language_code: 'pt' },
    { name: 'Argentina', code: 'AR', dial_code: '+54', flag: '🇦🇷', currency: 'ARS', language_code: 'es' },
    { name: 'Colombia', code: 'CO', dial_code: '+57', flag: '🇨🇴', currency: 'COP', language_code: 'es' },
    { name: 'Philippines', code: 'PH', dial_code: '+63', flag: '🇵🇭', currency: 'PHP', language_code: 'en' },
    { name: 'Hong Kong', code: 'HK', dial_code: '+852', flag: '🇭🇰', currency: 'HKD', language_code: 'zh' },
    { name: 'Taiwan', code: 'TW', dial_code: '+886', flag: '🇹🇼', currency: 'TWD', language_code: 'zh' },
    { name: 'Israel', code: 'IL', dial_code: '+972', flag: '🇮🇱', currency: 'ILS', language_code: 'he' },
];

const languages = [
    { name: 'English', code: 'en', native_name: 'English', direction: 'ltr' },
    { name: 'Hindi', code: 'hi', native_name: 'हिन्दी', direction: 'ltr' },
    { name: 'Chinese', code: 'zh', native_name: '中文', direction: 'ltr' },
    { name: 'Spanish', code: 'es', native_name: 'Español', direction: 'ltr' },
    { name: 'French', code: 'fr', native_name: 'Français', direction: 'ltr' },
    { name: 'Arabic', code: 'ar', native_name: 'العربية', direction: 'rtl' },
    { name: 'Portuguese', code: 'pt', native_name: 'Português', direction: 'ltr' },
    { name: 'German', code: 'de', native_name: 'Deutsch', direction: 'ltr' },
    { name: 'Japanese', code: 'ja', native_name: '日本語', direction: 'ltr' },
    { name: 'Korean', code: 'ko', native_name: '한국어', direction: 'ltr' },
    { name: 'Russian', code: 'ru', native_name: 'Русский', direction: 'ltr' },
    { name: 'Italian', code: 'it', native_name: 'Italiano', direction: 'ltr' },
    { name: 'Dutch', code: 'nl', native_name: 'Nederlands', direction: 'ltr' },
    { name: 'Turkish', code: 'tr', native_name: 'Türkçe', direction: 'ltr' },
    { name: 'Thai', code: 'th', native_name: 'ภาษาไทย', direction: 'ltr' },
    { name: 'Vietnamese', code: 'vi', native_name: 'Tiếng Việt', direction: 'ltr' },
    { name: 'Indonesian', code: 'id', native_name: 'Bahasa Indonesia', direction: 'ltr' },
    { name: 'Malay', code: 'ms', native_name: 'Bahasa Melayu', direction: 'ltr' },
    { name: 'Bengali', code: 'bn', native_name: 'বাংলা', direction: 'ltr' },
    { name: 'Urdu', code: 'ur', native_name: 'اردو', direction: 'rtl' },
    { name: 'Tamil', code: 'ta', native_name: 'தமிழ்', direction: 'ltr' },
    { name: 'Swedish', code: 'sv', native_name: 'Svenska', direction: 'ltr' },
    { name: 'Polish', code: 'pl', native_name: 'Polski', direction: 'ltr' },
    { name: 'Hebrew', code: 'he', native_name: 'עִبְרִית', direction: 'rtl' },
];

const currencies = [
    { name: 'US Dollar', code: 'USD', symbol: '$', exchange_rate: 1 },
    { name: 'Indian Rupee', code: 'INR', symbol: '₹', exchange_rate: 83.5 },
    { name: 'Euro', code: 'EUR', symbol: '€', exchange_rate: 0.92 },
    { name: 'British Pound', code: 'GBP', symbol: '£', exchange_rate: 0.79 },
    { name: 'Japanese Yen', code: 'JPY', symbol: '¥', exchange_rate: 151.2 },
    { name: 'Chinese Yuan', code: 'CNY', symbol: '¥', exchange_rate: 7.23 },
    { name: 'Canadian Dollar', code: 'CAD', symbol: 'C$', exchange_rate: 1.36 },
    { name: 'Australian Dollar', code: 'AUD', symbol: 'A$', exchange_rate: 1.52 },
    { name: 'Brazilian Real', code: 'BRL', symbol: 'R$', exchange_rate: 5.06 },
];

const seedLocales = async () => {
    await connectDB();

    try {
        const fs = require('fs');
        const path = require('path');
        const translationsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/translations.json'), 'utf8'));

        // Seed Countries
        const countryCount = await Country.countDocuments();
        if (countryCount === 0) {
            await Country.insertMany(countries);
            console.log(`✅ ${countries.length} countries seeded`);
        }

        // Seed/Update Languages with Translations
        for (const langData of languages) {
            const langTranslations = translationsData[langData.code] || {};
            await Language.findOneAndUpdate(
                { code: langData.code },
                { 
                    ...langData, 
                    translations: langTranslations 
                },
                { upsert: true, new: true }
            );
        }
        console.log(`✅ ${languages.length} languages seeded/updated with translations`);

        // Seed Currencies
        const currCount = await Currency.countDocuments();
        if (currCount === 0) {
            await Currency.insertMany(currencies);
            console.log(`✅ ${currencies.length} currencies seeded`);
        }

        console.log('✅ Locale seeding complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Locale seeding failed:', error.message);
        process.exit(1);
    }
};

seedLocales();
