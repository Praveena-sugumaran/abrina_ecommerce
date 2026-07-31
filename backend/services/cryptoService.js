const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
// Deriving a secure 32-byte key from JWT_SECRET or fallback
const ENCRYPTION_KEY = crypto.scryptSync(
    process.env.JWT_SECRET || 'b2b_marketplace_license_crypto_encryption_key_2026',
    'license-salt',
    32
);
const IV_LENGTH = 16;

/**
 * Encrypts cleartext using AES-256-CBC
 * @param {string} text 
 * @returns {string} iv:encrypted_hex
 */
const encrypt = (text) => {
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts text using AES-256-CBC
 * @param {string} text 
 * @returns {string} cleartext
 */
const decrypt = (text) => {
    if (!text) return '';
    try {
        const textParts = text.split(':');
        if (textParts.length !== 2) return '';
        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedText = Buffer.from(textParts[1], 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption failed, data might be modified:', err.message);
        return '';
    }
};

module.exports = {
    encrypt,
    decrypt
};
