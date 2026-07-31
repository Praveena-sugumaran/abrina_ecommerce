const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a random stream key
 */
const generateStreamKey = () => {
    return `key_${crypto.randomBytes(16).toString('hex')}`;
};

/**
 * Get RTMP Push URL based on provider type
 */
const getRtmpUrl = (streamKey, provider) => {
    switch (provider) {
        case 'zegocloud':
            return `rtmp://push.zegocloud.com/live/`;
        default:
            return `rtmp://localhost/live/`;
    }
};

/**
 * Get Playback Pull URL based on provider type
 */
const getPlaybackUrl = (streamKey, provider) => {
    switch (provider) {
        case 'zegocloud':
            return `https://pull.zegocloud.com/live/${streamKey}.m3u8`;
        default:
            return `http://localhost:8080/live/${streamKey}.m3u8`;
    }
};

/**
 * Validate stream key against hashed database value
 */
const verifyStreamKey = async (rawKey, hashedKey) => {
    if (!rawKey || !hashedKey) return false;
    return await bcrypt.compare(rawKey, hashedKey);
};

module.exports = {
    generateStreamKey,
    getRtmpUrl,
    getPlaybackUrl,
    verifyStreamKey
};
