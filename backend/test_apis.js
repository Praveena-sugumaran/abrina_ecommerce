const axios = require('axios');
const urls = [
    'http://localhost:5010/api/homepage-sections',
    'http://localhost:5010/api/coupons/public',
    'http://localhost:5010/api/products?section=Top%20Deals&limit=4',
    'http://localhost:5010/api/products?section=Top%20Deals&limit=6&offset=4',
    'http://localhost:5010/api/products?section=Top%20Ranking&limit=8',
    'http://localhost:5010/api/products?section=New%20Arrivals&limit=8',
    'http://localhost:5010/api/products?section=Top%20Ranking&limit=4'
];

async function run() {
    for (const url of urls) {
        const start = Date.now();
        console.log(`Fetching ${url}...`);
        try {
            const res = await axios.get(url, { timeout: 15000 });
            console.log(`Success in ${Date.now() - start}ms: status=${res.status}`);
        } catch (err) {
            console.log(`Failed/Timeout in ${Date.now() - start}ms: ${err.message}`);
        }
    }
}
run();
