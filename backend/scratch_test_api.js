const axios = require('axios');

async function testApi() {
    const baseURL = 'http://localhost:5010/api';
    
    console.log("\nTesting GET /categories...");
    try {
        const res = await axios.get(`${baseURL}/categories`);
        console.log(`GET /categories succeeded. Count: ${res.data.length}`);
        if (res.data.length > 0) {
            console.log(`First item:`, JSON.stringify(res.data[0], null, 2));
        }
    } catch (err) {
        console.error(`GET /categories failed:`, err.message);
    }

    console.log("\nLogging in...");
    let token = '';
    try {
        const loginRes = await axios.post(`${baseURL}/auth/login`, {
            email: 'admin@example.com',
            password: 'password'
        });
        token = loginRes.data.token;
        console.log("Logged in! Token length:", token ? token.length : 0);
    } catch (err) {
        console.error("Login failed:", err.message);
        process.exit(1);
    }

    const headers = { Authorization: `Bearer ${token}` };

    console.log("\n1. Testing GET /admin/menu...");
    const tMenuStart = Date.now();
    try {
        const res = await axios.get(`${baseURL}/admin/menu`, { headers });
        console.log(`GET /admin/menu succeeded in ${Date.now() - tMenuStart}ms (Menu items: ${res.data.length})`);
    } catch (err) {
        console.error(`GET /admin/menu failed in ${Date.now() - tMenuStart}ms:`, err.message);
    }

    console.log("\n2. Testing GET /admin/companies...");
    const tCompaniesStart = Date.now();
    try {
        const res = await axios.get(`${baseURL}/admin/companies`, { headers });
        console.log(`GET /admin/companies succeeded in ${Date.now() - tCompaniesStart}ms (Companies: ${res.data.length})`);
    } catch (err) {
        console.error(`GET /admin/companies failed in ${Date.now() - tCompaniesStart}ms:`, err.message);
    }

    console.log("\n3. Testing GET /admin/stats...");
    const tStatsStart = Date.now();
    try {
        const res = await axios.get(`${baseURL}/admin/stats`, { headers });
        console.log(`GET /api/admin/stats succeeded in ${Date.now() - tStatsStart}ms. Total Users: ${res.data.totalUsers}`);
    } catch (err) {
        console.error(`GET /api/admin/stats failed in ${Date.now() - tStatsStart}ms:`, err.message);
    }
}

testApi();
