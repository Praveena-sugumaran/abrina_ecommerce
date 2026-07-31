const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/b2c_db';

async function run() {
    try {
        const conn = await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB!');
        
        const OtpVerification = conn.model('OtpVerification', new mongoose.Schema({}, { strict: false }), 'otpverifications');
        const otps = await OtpVerification.find().sort({ createdAt: -1 }).limit(10);
        console.log('Latest OTP Verification records:');
        console.log(JSON.stringify(otps, null, 2));
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
