const redis = require('redis');

let client = null;
let isRedisConnected = false;

// In-memory cache fallback when Redis is offline
const memoryCache = new Map();

const initRedis = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
        client = redis.createClient({ url: redisUrl });
        
        client.on('error', (err) => {
            if (isRedisConnected) {
                console.warn('Redis Connection Lost, switching to in-memory cache:', err.message);
            }
            isRedisConnected = false;
        });

        client.on('connect', () => {
            console.log('⚡ Redis Cache Engine Connected');
            isRedisConnected = true;
        });

        await client.connect().catch(err => {
            console.log('ℹ️ Redis server not reachable locally, using high-speed In-Memory Cache fallback');
        });
    } catch (e) {
        console.log('ℹ️ Memory cache active');
    }
};

initRedis();

const getCache = async (key) => {
    try {
        if (isRedisConnected && client) {
            const data = await client.get(key);
            return data ? JSON.parse(data) : null;
        }
        const item = memoryCache.get(key);
        if (!item) return null;
        if (item.expiry && item.expiry < Date.now()) {
            memoryCache.delete(key);
            return null;
        }
        return item.value;
    } catch (e) {
        return null;
    }
};

const setCache = async (key, value, ttlSeconds = 300) => {
    try {
        if (isRedisConnected && client) {
            await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
            return;
        }
        memoryCache.set(key, {
            value,
            expiry: Date.now() + (ttlSeconds * 1000)
        });
    } catch (e) {}
};

const delCache = async (key) => {
    try {
        if (isRedisConnected && client) {
            await client.del(key);
        }
        memoryCache.delete(key);
    } catch (e) {}
};

const clearCachePattern = async (patternPrefix) => {
    try {
        if (isRedisConnected && client) {
            const keys = await client.keys(`${patternPrefix}*`);
            if (keys && keys.length > 0) {
                await client.del(keys);
            }
        }
        for (const k of memoryCache.keys()) {
            if (k.startsWith(patternPrefix)) {
                memoryCache.delete(k);
            }
        }
    } catch (e) {}
};

module.exports = { getCache, setCache, delCache, clearCachePattern };
