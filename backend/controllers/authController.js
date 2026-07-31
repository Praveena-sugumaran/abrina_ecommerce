const User = require('../models/User');
const Country = require('../models/Country');
const Product = require('../models/Product');
const Wishlist = require('../models/Wishlist');
const jwt = require('jsonwebtoken');
const riskService = require('../services/riskService');
const { addJob } = require('../services/queueService');
const { sendMail } = require('../services/mailService');
const SiteSetting = require('../models/SiteSetting');
const axios = require('axios');
const { sendSms, normalizePhoneNumber } = require('../services/smsService');

// Verify Google reCAPTCHA v2
const verifyRecaptcha = async (token) => {
    const settings = await SiteSetting.findOne();
    if (!settings?.enable_recaptcha) return true;
    if (!token) return false;

    try {
        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${settings.recaptcha_secret_key}&response=${token}`
        );
        return !!response.data.success;
    } catch (err) {
        console.error('reCAPTCHA verification error:', err);
        return false;
    }
};

// Helper to parse User Agent
const parseUserAgent = (uaString) => {
    if (!uaString) {
        return { browser: 'Unknown', os: 'Unknown', deviceType: 'Desktop' };
    }
    let browser = 'Unknown';
    let os = 'Unknown';
    let deviceType = 'Desktop';

    if (/mobile/i.test(uaString)) {
        deviceType = 'Mobile';
    } else if (/tablet|ipad/i.test(uaString)) {
        deviceType = 'Tablet';
    }

    if (/iphone|ipad|ipod/i.test(uaString)) {
        os = 'iOS';
        deviceType = /ipad/i.test(uaString) ? 'Tablet' : 'Mobile';
    } else if (/android/i.test(uaString)) {
        os = 'Android';
        deviceType = 'Mobile';
    } else if (/windows/i.test(uaString)) {
        os = 'Windows';
    } else if (/macintosh|mac os x/i.test(uaString)) {
        os = 'macOS';
    } else if (/linux/i.test(uaString)) {
        os = 'Linux';
    }

    if (/chrome|crios/i.test(uaString) && !/edge|edg/i.test(uaString) && !/opr/i.test(uaString)) {
        browser = 'Chrome';
    } else if (/safari/i.test(uaString) && !/chrome|crios/i.test(uaString)) {
        browser = 'Safari';
    } else if (/firefox|fxios/i.test(uaString)) {
        browser = 'Firefox';
    } else if (/edge|edg/i.test(uaString)) {
        browser = 'Edge';
    } else if (/opr/i.test(uaString) || /opera/i.test(uaString)) {
        browser = 'Opera';
    }
    return { browser, os, deviceType };
};

// Generate JWT Token with Stateful Session
const generateToken = async (id, req = null, isAdmin = false) => {
    if (!req) {
        return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    }

    try {
        const UserSession = require('../models/UserSession');
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown';
        const userAgent = req.headers['user-agent'] || '';
        const { browser, os, deviceType } = parseUserAgent(userAgent);

        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const session = await UserSession.create({
            user_id: id,
            user_type: isAdmin ? 'AdminUser' : 'User',
            ip_address: ipAddress,
            user_agent: userAgent,
            device_type: deviceType,
            device_name: deviceType + ' — ' + browser,
            os,
            browser,
            is_active: true,
            expires_at: expiresAt
        });

        return jwt.sign({ id, sessionId: session._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    } catch (err) {
        console.error('Session creation error, falling back to stateless token:', err);
        return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    }
};

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Helper for social login
const handleSocialLogin = async (socialUser, res, req = null) => {
    const User = require('../models/User'); // Ensure model is available
    let user = await User.findOne({ email: String(socialUser.email) });
    if (!user) {
        // 🚨 Do NOT create user immediately.
        // Instead, issue a temporary token and redirect to onboarding
        const tempToken = jwt.sign(
            {
                email: socialUser.email,
                name: socialUser.name,
                image: socialUser.image || '',
                provider: socialUser.provider || 'google',
                isTemp: true
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.send(`
            <html>
                <body>
                    <script>
                        window.location.href = '${frontendUrl}/social-register?token=${tempToken}';
                    </script>
                </body>
            </html>
        `);
    }

    // User already exists → Normal login

    const token = await generateToken(user._id, req);
    const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    res.send(`
        <html>
            <body>
                <script>
                    localStorage.setItem('token', '${token}');
                    localStorage.setItem('user', JSON.stringify(${JSON.stringify({
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        roles: user.roles,
        status: user.status
    })}));
                    window.location.href = '${redirectUrl}/';
                </script>
            </body>
        </html>
    `);
};

// POST /api/auth/social-register
exports.socialRegister = async (req, res) => {
    try {
        const {
            token, role,
            first_name, last_name,
            country_code, phone_number,
            company_name,
            business_type,
            state
        } = req.body;

        if (!token || !role) {
            return res.status(400).json({ message: 'Token and role are required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.isTemp) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const User = require('../models/User');
        let existingUser = await User.findOne({ email: String(decoded.email) });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // CREATE USER ONLY NOW
        const newUser = await User.create({
            first_name: first_name || decoded.name.split(' ')[0] || 'Social',
            last_name: last_name || decoded.name.split(' ')[1] || 'User',
            email: decoded.email,
            roles: [role || 'buyer'],
            password: Math.random().toString(36).slice(-10), // Random password
            status: 'active',
            is_verified: false,
            provider: decoded.provider || 'google',
            country_code: country_code || '',
            phone_number: phone_number || '',
            company_name: role === 'seller' ? company_name : '',
            business_type: business_type || [],
            state: state || '',
            profile_image: decoded.image || ''
        });

        const authToken = await generateToken(newUser._id, req);

        res.json({
            success: true,
            token: authToken,
            user: {
                _id: newUser._id,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email: newUser.email,
                roles: newUser.roles,
                status: newUser.status
            }
        });

    } catch (err) {
        console.error('socialRegister error:', err);
        res.status(500).json({ message: 'Error completing registration: ' + err.message });
    }
};

// ─────────────────────────────────────────────
// STEP 1: Check email → send OTP
// POST /api/auth/send-otp
// ─────────────────────────────────────────────
exports.sendOtp = async (req, res) => {
    try {
        const { email, password, first_name, last_name, company_name, phone_number, role, country_code, recaptchaToken } = req.body;

        // reCAPTCHA Validation
        const isHuman = await verifyRecaptcha(recaptchaToken);
        if (!isHuman) return res.status(403).json({ message: 'Security check failed. Please refresh and try again.' });

        if (!email) return res.status(400).json({ message: 'Email is required' });

        const otp = generateOTP();
        const otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        const cleanEmail = email ? String(email) : '';
        const existing = await User.findOne({ email: cleanEmail });
        
        if (existing && existing.status === 'active' && !req.body.isReset) {
            return res.status(409).json({ 
                message: 'Account already exists. Please login.',
                exists: true 
            });
        }

        if (existing) {
            existing.otp = otp;
            existing.otp_expires = otp_expires;
            await existing.save({ validateBeforeSave: false });
        } else {
            // New user registration flow - DO NOT CREATE USER HERE
            const OtpVerification = require('../models/OtpVerification');
            await OtpVerification.findOneAndUpdate(
                { email: cleanEmail },
                { otp, otp_expires, is_verified: false },
                { upsert: true, new: true }
            );
        }

        // Send OTP via Email - BYPASS QUEUE for speed
        try {
            await sendMail({
                to: email,
                subject: 'Your Verification Code - Alibaba Demo',
                text: `Your verification code is ${otp}. It expires in 10 minutes.`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #ff6600;">Email Verification</h2>
                        <p>Thank you for registering. Please use the following code to verify your email address:</p>
                        <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                            ${otp}
                        </div>
                        <p>This code will expire in 10 minutes.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                    </div>
                `
            });
        } catch (mailErr) {
            console.error('OTP Mail Error:', mailErr);
            // If mail fails, we might still want to continue if it was a queue issue, 
            // but since we bypassed it, we should probably tell the user.
        }

        res.json({
            success: true,
            message: `OTP sent to ${email}`
        });
    } catch (error) {
        console.error('sendOtp error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// STEP 2: Verify OTP
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

        let user = await User.findOne({ email }).select('+otp +otp_expires +twoFactorSecret').populate('subscription_plan');
        let isAdminUser = false;
        if (!user) {
            const AdminUser = require('../models/AdminUser');
            user = await AdminUser.findOne({ email }).select('+twoFactorSecret').populate('role_id').populate('assignedWarehouses');
            if (user) isAdminUser = true;
        }
        
        if (user) {
            if (user.twoFactorSecret) {
                const speakeasy = require('speakeasy');
                const verified = speakeasy.totp.verify({
                    secret: user.twoFactorSecret,
                    encoding: 'base32',
                    token: otp,
                    window: 1
                });
                if (!verified) return res.status(400).json({ message: 'Invalid Authenticator Code' });

                user.otp = undefined;
                user.otp_expires = undefined;
                await user.save({ validateBeforeSave: false });

                let permissions = [];
                const userRoles = user.roles || (user.role ? [user.role] : []);
                if (userRoles.includes('admin') || isAdminUser) {
                    if (!user.role_id) {
                        const Permission = require('../models/Permission');
                        const allPerms = await Permission.find();
                        permissions = allPerms.map(p => p.slug);
                    } else {
                        const RolePermission = require('../models/RolePermission');
                        const rolePerms = await RolePermission.find({ role_id: user.role_id }).populate('permission_id');
                        permissions = rolePerms.map(rp => rp.permission_id?.slug).filter(Boolean);
                    }
                }

                return res.json({
                    success: true,
                    _id: user._id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    roles: userRoles.length > 0 ? userRoles : ['admin'],
                    role: user.role || 'admin',
                    status: user.status,
                    subscription_plan: user.subscription_plan,
                    payout_methods: user.payout_methods || [],
                    token: await generateToken(user._id, req, isAdminUser),
                    permissions,
                    role_id: user.role_id || null
                });
            }

            if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
            if (user.otp_expires < Date.now()) return res.status(400).json({ message: 'OTP has expired' });

            user.otp = undefined;
            user.otp_expires = undefined;
            user.status = 'active'; // In case it was somehow pending from old code
            await user.save({ validateBeforeSave: false });

            return res.json({
                success: true,
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                roles: user.roles,
                status: user.status,
                subscription_plan: user.subscription_plan,
                payout_methods: user.payout_methods || [],
                token: await generateToken(user._id, req),
            });
        }

        // Check Temp OtpVerification for new users
        const OtpVerification = require('../models/OtpVerification');
        const otpRecord = await OtpVerification.findOne({ email: String(email) });

        if (!otpRecord) return res.status(404).json({ message: 'Session expired. Please try again.' });
        if (otpRecord.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
        if (otpRecord.otp_expires < Date.now()) return res.status(400).json({ message: 'OTP has expired' });

        // OTP is valid!
        otpRecord.is_verified = true;
        await otpRecord.save();

        res.json({
            success: true,
            message: 'OTP verified successfully.'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// Send Mobile OTP
// POST /api/auth/send-mobile-otp
// ─────────────────────────────────────────────
exports.sendMobileOtp = async (req, res) => {
    try {
        const { phone_number, country_code } = req.body;
        if (!phone_number) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        const cleanPhone = normalizePhoneNumber(phone_number);
        if (!cleanPhone) {
            return res.status(400).json({ success: false, message: 'A valid phone number is required' });
        }

        const otp = generateOTP();
        const otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Store OTP in database
        user.phone_otp = otp;
        user.phone_otp_expires = otp_expires;
        user.phone_number = cleanPhone;
        if (country_code) {
            user.country_code = country_code;
        }
        await user.save({ validateBeforeSave: false });

        // Send SMS using twilio service
        const smsRes = await sendSms(cleanPhone, `Your B2C AliExpress Clone verification code is ${otp}. It expires in 10 minutes.`);

        res.json({
            success: true,
            message: smsRes.simulated 
                ? `OTP sent to ${cleanPhone} (Simulation code: ${otp})`
                : `OTP sent to ${cleanPhone}`,
            otp: smsRes.simulated ? otp : undefined
        });
    } catch (err) {
        console.error('sendMobileOtp error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────
// Verify Mobile OTP
// POST /api/auth/verify-mobile-otp
// ─────────────────────────────────────────────
exports.verifyMobileOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        if (!otp) {
            return res.status(400).json({ success: false, message: 'OTP code is required' });
        }

        const user = await User.findById(req.user._id).select('+phone_otp +phone_otp_expires');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.phone_otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }

        if (user.phone_otp_expires < Date.now()) {
            return res.status(400).json({ success: false, message: 'Verification code has expired' });
        }

        // OTP is verified successfully!
        user.phone_otp = undefined;
        user.phone_otp_expires = undefined;
        user.is_phone_verified = true;
        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            message: 'Mobile number verified successfully!',
            is_phone_verified: true
        });
    } catch (err) {
        console.error('verifyMobileOtp error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────
// Send Mobile OTP for Registration (Unauthenticated)
// POST /api/auth/register/send-mobile-otp
// ─────────────────────────────────────────────
exports.sendRegisterMobileOtp = async (req, res) => {
    try {
        const { phone_number, country_code } = req.body;
        if (!phone_number) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        const cleanPhone = normalizePhoneNumber(phone_number);
        if (!cleanPhone) {
            return res.status(400).json({ success: false, message: 'A valid phone number is required' });
        }

        // Check if there is an active user with this phone number
        const existingUser = await User.findOne({ phone_number: cleanPhone, status: 'active' });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'An account with this phone number already exists' });
        }

        const otp = generateOTP();
        const otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const MobileOtpVerification = require('../models/MobileOtpVerification');
        await MobileOtpVerification.findOneAndUpdate(
            { phone_number: cleanPhone },
            { otp, otp_expires, is_verified: false },
            { upsert: true, new: true }
        );

        // Send SMS using twilio service
        const smsRes = await sendSms(cleanPhone, `Your B2C AliExpress Clone registration verification code is ${otp}. It expires in 10 minutes.`);

        res.json({
            success: true,
            message: smsRes.simulated
                ? `OTP sent to ${cleanPhone} (Simulation code: ${otp})`
                : `OTP sent to ${cleanPhone}`,
            otp: smsRes.simulated ? otp : undefined
        });
    } catch (err) {
        console.error('sendRegisterMobileOtp error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────
// Verify Mobile OTP for Registration (Unauthenticated)
// POST /api/auth/register/verify-mobile-otp
// ─────────────────────────────────────────────
exports.verifyRegisterMobileOtp = async (req, res) => {
    try {
        const { phone_number, otp } = req.body;
        if (!phone_number || !otp) {
            return res.status(400).json({ success: false, message: 'Phone number and OTP code are required' });
        }

        const cleanPhone = normalizePhoneNumber(phone_number);
        if (!cleanPhone) {
            return res.status(400).json({ success: false, message: 'A valid phone number is required' });
        }

        const MobileOtpVerification = require('../models/MobileOtpVerification');
        const verificationRecord = await MobileOtpVerification.findOne({ phone_number: cleanPhone });

        if (!verificationRecord) {
            return res.status(404).json({ success: false, message: 'Session expired or not found. Please request a new OTP.' });
        }

        if (verificationRecord.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }

        if (verificationRecord.otp_expires < Date.now()) {
            return res.status(400).json({ success: false, message: 'Verification code has expired' });
        }

        // Mark verified
        verificationRecord.is_verified = true;
        await verificationRecord.save();

        res.json({
            success: true,
            message: 'Mobile number verified successfully!',
            is_phone_verified: true
        });
    } catch (err) {
        console.error('verifyRegisterMobileOtp error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────
// STEP 3: Complete Registration
// POST /api/auth/register
// ─────────────────────────────────────────────
exports.register = async (req, res) => {
    try {
        const { email, first_name, last_name, password, role, country_code, phone_number, state, recaptchaToken, referral_code, referralCode } = req.body;

        // reCAPTCHA Validation
        const isHuman = await verifyRecaptcha(recaptchaToken);
        if (!isHuman) return res.status(403).json({ message: 'Security check failed. Please refresh and try again.' });

        if (!email || !first_name || !last_name || !password || !phone_number || !state) {
            return res.status(400).json({ message: 'Missing mandatory fields. First name, last name, password, phone, and state are required.' });
        }

        if (role === 'seller' && !req.body.company_name) {
            return res.status(400).json({ message: 'Company name is required for sellers' });
        }

        const OtpVerification = require('../models/OtpVerification');
        const otpRecord = await OtpVerification.findOne({ email: String(email), is_verified: true });
        
        if (!otpRecord) {
            return res.status(400).json({ message: 'Email verification required. Please verify your email first.' });
        }

        const existingUser = await User.findOne({ email: String(email) });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Check if mobile number verification is enabled
        const settings = await SiteSetting.findOne();
        let isPhoneVerifiedVal = false;
        const cleanPhone = normalizePhoneNumber(phone_number);
        if (settings?.enable_mobile_verification) {
            const MobileOtpVerification = require('../models/MobileOtpVerification');
            const phoneOtpRecord = await MobileOtpVerification.findOne({ phone_number: cleanPhone, is_verified: true });
            if (!phoneOtpRecord) {
                return res.status(400).json({ message: 'Mobile number verification is required.' });
            }
            isPhoneVerifiedVal = true;
            // Delete the verification record after successful registration
            await MobileOtpVerification.deleteOne({ _id: phoneOtpRecord._id });
        }

        // Validate country_code if provided
        let countryRecord = null;
        if (country_code) {
            countryRecord = await Country.findOne({ code: country_code.toUpperCase() });
        }

        // Validate referral code if provided
        let referrer = null;
        const refCode = referral_code || referralCode;
        if (refCode) {
            if (refCode.length === 24) {
                referrer = await User.findById(refCode);
            } else if (refCode.length === 8) {
                referrer = await User.findOne({
                    $expr: {
                        $eq: [
                            { $substrCP: [{ $toString: "$_id" }, 16, 8] },
                            refCode
                        ]
                    }
                });
            }
        }

        const user = await User.create({
            email: String(email),
            password,
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            roles: [role || 'buyer'],
            status: 'active',
            country_code: country_code || '',
            phone_number: cleanPhone || '',
            state: req.body.state || '',
            company_name: req.body.company_name || '',
            business_type: req.body.business_type ? [req.body.business_type] : [],
            address_line1: req.body.company_address || '',
            zip_code: req.body.zip_code || '',
            is_verified: false,
            is_phone_verified: isPhoneVerifiedVal,
            referred_by: referrer ? referrer._id : null,
            loyalty_points: referrer ? 200 : 0
        });

        await OtpVerification.deleteOne({ _id: otpRecord._id });

        if (referrer) {
            try {
                const LoyaltyTransaction = require('../models/LoyaltyTransaction');
                await LoyaltyTransaction.create({
                    user: user._id,
                    points: 200,
                    type: 'referral',
                    description: `Signup reward for using referral code from ${referrer.first_name} ${referrer.last_name}`
                });
            } catch (refTxErr) {
                console.error('Error creating referral loyalty transaction:', refTxErr);
            }
        }

        const { sendNotification } = require('../services/notificationService');
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            await sendNotification(
                req.io,
                admin._id,
                `New ${user.role} Signup`,
                `${user.first_name} ${user.last_name} has signed up.`,
                'admin',
                '/admin/users'
            );

            // 📧 Send email to Admin
            try {
                await addJob('email', {
                    to: admin.email,
                    subject: `New User Registration - ${user.role}`,
                    text: `A new ${user.role} (${user.first_name} ${user.last_name}) has signed up.`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #ff6600;">New User Signup</h2>
                            <p>A new user has completed their profile setup on Alibaba Demo.</p>
                            <div style="background: #f4f4f4; padding: 15px; margin: 20px 0;">
                                <p><strong>Name:</strong> ${user.first_name} ${user.last_name}</p>
                                <p><strong>Email:</strong> ${user.email}</p>
                                <p><strong>Role:</strong> ${user.role}</p>
                            </div>
                            <a href="${process.env.FRONTEND_URL}/admin/users" style="background: #ff6600; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Manage Users</a>
                        </div>
                    `
                });
            } catch (adminMailErr) {
                console.error('Admin signup notification email error:', adminMailErr);
            }
        }

        res.status(201).json({
            success: true,
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            roles: user.roles,
            status: user.status,
            token: await generateToken(user._id, req),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { email, password, recaptchaToken } = req.body;

        // reCAPTCHA Validation
        const isHuman = await verifyRecaptcha(recaptchaToken);
        if (!isHuman) return res.status(403).json({ message: 'Security check failed. Please refresh and try again.' });

        let user = await User.findOne({ email: String(email) }).select('+password +twoFactorSecret').populate('subscription_plan');
        let isAdminUser = false;
        if (!user) {
            const AdminUser = require('../models/AdminUser');
            user = await AdminUser.findOne({ email: String(email) }).select('+password +twoFactorSecret').populate('role_id').populate('assignedWarehouses');
            if (user) {
                isAdminUser = true;
                if (user.status === 'inactive') {
                    return res.status(403).json({ message: 'Your account is deactivated' });
                }
            }
        }

        if (!user || user.isDeleted) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (await user.matchPassword(password)) {
            // Check if 2FA is enabled


            if (user.twoFactorEnabled) {
                if (user.twoFactorSecret) {
                    return res.json({
                        requiresOTP: true,
                        message: '2FA required. Please enter the code from your authenticator app.',
                        email: user.email
                    });
                }

                if (!isAdminUser) {
                    const otp = generateOTP();
                    const otp_expires = new Date(Date.now() + 10 * 60 * 1000);
                    user.otp = otp;
                    user.otp_expires = otp_expires;
                    await user.save({ validateBeforeSave: false });

                    // Send 2FA OTP via Email - BYPASS QUEUE
                    try {
                        await sendMail({
                            to: email,
                            subject: 'Your 2FA Login Code - Alibaba Demo',
                            text: `Your 2FA login code is ${otp}. It expires in 10 minutes.`,
                            html: `
                                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                                    <h2 style="color: #ff6600;">Two-Factor Authentication</h2>
                                    <p>A login attempt was made. Use the code below to complete your login:</p>
                                    <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                                        ${otp}
                                    </div>
                                    <p>This code will expire in 10 minutes.</p>
                                </div>
                            `
                        });
                    } catch (mailErr) {
                        console.error('2FA Mail Error:', mailErr);
                    }

                    return res.json({
                        requiresOTP: true,
                        message: '2FA required. Please enter the code sent to your email.',
                        email: user.email
                    });
                }
            }

            // Let's populate permissions if admin
            let permissions = [];
            const userRoles = user.roles || (user.role ? [user.role] : []);
            if (userRoles.includes('admin') || isAdminUser) {
                if (!user.role_id) {
                    // Super Admin
                    const Permission = require('../models/Permission');
                    const allPerms = await Permission.find();
                    permissions = allPerms.map(p => p.slug);
                } else {
                    const RolePermission = require('../models/RolePermission');
                    const rolePerms = await RolePermission.find({ role_id: user.role_id }).populate('permission_id');
                    permissions = rolePerms.map(rp => rp.permission_id?.slug).filter(Boolean);
                }

                // Log Audit
                const auditService = require('../services/auditService');
                await auditService.logAction(req, 'Login', 'AUTH', 'success', { email: user.email, name: user.name || `${user.first_name} ${user.last_name}` });
            }

            res.json({
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                roles: userRoles.length > 0 ? userRoles : ['admin'],
                role: user.role || 'admin',
                company_name: user.company_name || '',
                status: user.status,
                subscription_plan: user.subscription_plan,
                payout_methods: user.payout_methods || [],
                token: await generateToken(user._id, req, isAdminUser),
                twoFactorEnabled: user.twoFactorEnabled || false,
                permissions,
                role_id: user.role_id || null
            });
        } else {
            // 🛡️ Log suspicious login attempt
            await riskService.logRisk(user._id, 'failed_login', 'medium', `Failed login attempt for ${email}`);
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// Get Profile
// GET /api/auth/profile
// Authenticated
// ─────────────────────────────────────────────
exports.getProfile = async (req, res) => {
    try {
        let user = await User.findById(req.user.id).select('+twoFactorSecret').populate('subscription_plan');
        let isAdminUser = false;
        if (!user) {
            const AdminUser = require('../models/AdminUser');
            user = await AdminUser.findById(req.user.id).select('+twoFactorSecret').populate('role_id').populate('assignedWarehouses');
            if (user) {
                isAdminUser = true;
            }
        }

        if (user) {
            let permissions = [];
            const userRoles = user.roles || (user.role ? [user.role] : []);
            if (userRoles.includes('admin') || isAdminUser) {
                if (!user.role_id) {
                    const Permission = require('../models/Permission');
                    const allPerms = await Permission.find();
                    permissions = allPerms.map(p => p.slug);
                } else {
                    const RolePermission = require('../models/RolePermission');
                    const rolePerms = await RolePermission.find({ role_id: user.role_id }).populate('permission_id');
                    permissions = rolePerms.map(rp => rp.permission_id?.slug).filter(Boolean);
                }
            }

            const userObj = user.toObject({ virtuals: true });
            userObj.permissions = permissions;
            userObj.hasTOTP = !!user.twoFactorSecret;
            delete userObj.twoFactorSecret; // Ensure secret is never exposed
            res.json(userObj);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// Update Profile (Business Info)
// PUT /api/auth/update-profile
// Authenticated
// ─────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { first_name, last_name, company_name, business_type, state, phone_number, language, currency, role } = req.body;

        if (first_name !== undefined) user.first_name = first_name;
        if (last_name !== undefined) user.last_name = last_name;
        if (company_name !== undefined) user.company_name = company_name;
        if (business_type !== undefined) user.business_type = business_type;
        if (state !== undefined) user.state = state;
        if (phone_number !== undefined) user.phone_number = phone_number;
        if (language !== undefined) user.language = language;
        if (currency !== undefined) user.currency = currency;

        // Handle role update/conversion
        if (role !== undefined) {
            if (role === 'seller' && !user.roles.includes('seller')) {
                user.roles.push('seller');
            } else if (role === 'customer' && !user.roles.includes('customer')) {
                user.roles.push('customer');
            } else if (role === 'admin' && req.user.roles.includes('admin')) {
                // Only admins can promote others to admin
                if (!user.roles.includes('admin')) user.roles.push('admin');
            }
        }

        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            user: {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                roles: user.roles,
                company_name: user.company_name,
                business_type: user.business_type,
                state: user.state,
                address_line1: user.address_line1,
                city: user.city,
                zip_code: user.zip_code,
                gst_number: user.gst_number,
                status: user.status,
                language: user.language,
                currency: user.currency
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// GET /api/auth/wishlist
// Authenticated
// ─────────────────────────────────────────────
exports.getWishlist = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const wishlists = await Wishlist.find({ buyer_id: req.user._id })
            .populate({
                path: 'product_id',
                select: 'name main_image images slug main_price oldPrice moq'
            });

        res.json(wishlists || []);
    } catch (error) {
        console.error('getWishlist error:', error);
        res.status(500).json({
            message: 'Error fetching wishlist',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// ─────────────────────────────────────────────
// Toggle Wishlist Item
// POST /api/auth/wishlist/toggle
// Authenticated
// ─────────────────────────────────────────────
exports.toggleWishlist = async (req, res) => {
    try {
        let { productId } = req.body;
        if (!productId) return res.status(400).json({ message: 'Product ID is required' });

        if (!req.user) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Resolve slug if needed
        if (typeof productId === 'string' && !productId.match(/^[0-9a-fA-F]{24}$/)) {
            const product = await Product.findOne({ slug: productId });
            if (!product) return res.status(404).json({ message: 'Product not found' });
            productId = product._id;
        }

        let isLiked = false;

        // Check user documents wishlist array
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        let wishlistArray = user.wishlist || [];
        const productIndex = wishlistArray.findIndex(id => id.toString() === productId.toString());

        if (productIndex > -1) {
            // Remove
            wishlistArray.splice(productIndex, 1);
            // Also clean up Wishlist collection just in case
            await Wishlist.deleteOne({ buyer_id: req.user._id, product_id: productId });
        } else {
            // Add
            const productCheck = await Product.findById(productId);
            if (!productCheck) return res.status(404).json({ message: 'Product not found' });

            wishlistArray.push(productId);
            // Add to collection
            await Wishlist.create({ buyer_id: req.user._id, product_id: productId });
            isLiked = true;
        }

        user.wishlist = wishlistArray;
        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            isLiked,
            wishlist: user.wishlist
        });
    } catch (error) {
        console.error('toggleWishlist error:', error);
        res.status(500).json({ message: 'Error toggling wishlist: ' + error.message });
    }
};

// Social Login Auth URLs is handled via exports below

exports.updateSecurity = async (req, res) => {
    try {
        const { twoFactorEnabled } = req.body;
        const User = require('../models/User');
        const AdminUser = require('../models/AdminUser');
        
        let user = await User.findById(req.user._id);
        if (!user) {
            user = await AdminUser.findById(req.user._id);
        }
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.twoFactorEnabled = twoFactorEnabled;
        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            message: `2FA ${twoFactorEnabled ? 'enabled' : 'disabled'} successfully`,
            twoFactorEnabled: user.twoFactorEnabled
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate Google Authenticator TOTP Secret & QR Code
// @route   GET /api/auth/generate-2fa
// @access  Private
exports.generate2FASecret = async (req, res) => {
    try {
        const speakeasy = require('speakeasy');
        const QRCode = require('qrcode');
        const User = require('../models/User');
        const AdminUser = require('../models/AdminUser');

        let user = await User.findById(req.user._id);
        if (!user) {
            user = await AdminUser.findById(req.user._id);
        }
        if (!user) return res.status(404).json({ message: 'User not found' });

        const secret = speakeasy.generateSecret({
            name: `PremiaB2C (${user.email})`
        });

        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            secret: secret.base32,
            qrCode: qrCodeDataUrl
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify TOTP token and enable 2FA
// @route   POST /api/auth/verify-enable-2fa
// @access  Private
exports.verifyAndEnable2FA = async (req, res) => {
    try {
        const { secret, token } = req.body;
        if (!secret || !token) {
            return res.status(400).json({ message: 'Secret and token are required' });
        }

        const speakeasy = require('speakeasy');
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1 // Allow 30 seconds offset
        });

        if (!verified) {
            return res.status(400).json({ message: 'Invalid authentication code. Please try again.' });
        }

        const User = require('../models/User');
        const AdminUser = require('../models/AdminUser');
        let user = await User.findById(req.user._id);
        if (!user) {
            user = await AdminUser.findById(req.user._id);
        }
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.twoFactorSecret = secret;
        user.twoFactorEnabled = true;
        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            message: 'Two-Factor Authentication enabled successfully.'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Disable TOTP 2FA
// @route   POST /api/auth/disable-2fa
// @access  Private
exports.disable2FA = async (req, res) => {
    try {
        const User = require('../models/User');
        const AdminUser = require('../models/AdminUser');
        let user = await User.findById(req.user._id);
        if (!user) {
            user = await AdminUser.findById(req.user._id);
        }
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.twoFactorSecret = undefined;
        user.twoFactorEnabled = false;
        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            message: 'Two-Factor Authentication disabled successfully.'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Social Login Handlers
exports.getSocialAuthUrls = async (req, res) => {
    try {
        const SocialLogin = require('../models/SocialLogin');
        const config = await SocialLogin.findOne();
        if (!config) return res.status(404).json({ message: 'Social login not configured' });

        const origin = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
        const urls = {};

        if (config.google?.enabled && config.google?.client_id) {
            const redirectUri = `${process.env.APP_URL || origin}/api/auth/google/callback`;
            const isMock = config.google.client_id.includes('mock');
            urls.google = isMock 
                ? `${redirectUri}?code=mock_google_code`
                : `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.google.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`;
        }

        if (config.facebook?.enabled && config.facebook?.app_id) {
            const redirectUri = `${process.env.APP_URL || origin}/api/auth/facebook/callback`;
            const isMock = config.facebook.app_id.includes('mock');
            urls.facebook = isMock 
                ? `${redirectUri}?code=mock_facebook_code`
                : `https://www.facebook.com/v12.0/dialog/oauth?client_id=${config.facebook.app_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile`;
        }

        if (config.linkedin?.enabled && config.linkedin?.client_id) {
            const redirectUri = `${process.env.APP_URL || origin}/api/auth/linkedin/callback`;
            const isMock = config.linkedin.client_id.includes('mock');
            urls.linkedin = isMock 
                ? `${redirectUri}?code=mock_linkedin_code`
                : `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${config.linkedin.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email`;
        }

        res.json(urls);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.googleCallback = async (req, res) => {
    const { code } = req.query;
    try {
        if (!code) return res.send('<script>window.close()</script>');

        const SocialLogin = require('../models/SocialLogin');
        const config = await SocialLogin.findOne();
        if (!config || !config.google?.enabled) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_disabled`);
        }

        const isMock = !config.google.client_id || !config.google.client_secret ||
                       config.google.client_id.includes('mock') || config.google.client_secret.includes('mock') ||
                       code === 'mock_google_code';

        if (isMock) {
            const userData = {
                id: '1234567890_google_mock',
                email: 'mock_google_user@example.com',
                name: 'Mock Google User',
                image: '',
                provider: 'google'
            };
            return await handleSocialLogin(userData, res, req);
        }

        const origin = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
        const redirectUri = `${process.env.APP_URL || origin}/api/auth/google/callback`;

        // 1. Exchange code for token
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: config.google.client_id,
            client_secret: config.google.client_secret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });

        const accessToken = tokenRes.data.access_token;

        // 2. Fetch User Profile
        const profileRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userData = {
            id: profileRes.data.id,
            email: profileRes.data.email,
            name: profileRes.data.name,
            image: profileRes.data.picture,
            provider: 'google'
        };

        await handleSocialLogin(userData, res, req);
    } catch (err) {
        console.error('Google OAuth Error:', err.response?.data || err.message);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
};

exports.facebookCallback = async (req, res) => {
    const { code } = req.query;
    try {
        if (!code) return res.send('<script>window.close()</script>');

        const SocialLogin = require('../models/SocialLogin');
        const config = await SocialLogin.findOne();
        if (!config || !config.facebook?.enabled) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=facebook_disabled`);
        }

        const isMock = !config.facebook.app_id || !config.facebook.app_secret ||
                       config.facebook.app_id.includes('mock') || config.facebook.app_secret.includes('mock') ||
                       code === 'mock_facebook_code';

        if (isMock) {
            const userData = {
                id: '1234567890_fb_mock',
                email: 'mock_facebook_user@example.com',
                name: 'Mock Facebook User',
                image: '',
                provider: 'facebook'
            };
            return await handleSocialLogin(userData, res, req);
        }

        const origin = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
        const redirectUri = `${process.env.APP_URL || origin}/api/auth/facebook/callback`;

        // 1. Exchange code for token
        const tokenRes = await axios.get('https://graph.facebook.com/v12.0/oauth/access_token', {
            params: {
                client_id: config.facebook.app_id,
                redirect_uri: redirectUri,
                client_secret: config.facebook.app_secret,
                code
            }
        });

        const accessToken = tokenRes.data.access_token;

        // 2. Fetch User Profile
        const profileRes = await axios.get('https://graph.facebook.com/me', {
            params: {
                fields: 'id,name,email,picture.type(large)',
                access_token: accessToken
            }
        });

        const userData = {
            id: profileRes.data.id,
            email: profileRes.data.email || `fb_${profileRes.data.id}@facebook.com`,
            name: profileRes.data.name,
            image: profileRes.data.picture?.data?.url || '',
            provider: 'facebook'
        };

        await handleSocialLogin(userData, res, req);
    } catch (err) {
        console.error('Facebook OAuth Error:', err.response?.data || err.message);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
};

exports.linkedinCallback = async (req, res) => {
    const { code } = req.query;
    try {
        if (!code) return res.send('<script>window.close()</script>');

        const SocialLogin = require('../models/SocialLogin');
        const config = await SocialLogin.findOne();
        if (!config || !config.linkedin?.enabled) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=linkedin_disabled`);
        }

        const isMock = !config.linkedin.client_id || !config.linkedin.client_secret ||
                       config.linkedin.client_id.includes('mock') || config.linkedin.client_secret.includes('mock') ||
                       code === 'mock_linkedin_code';

        if (isMock) {
            const userData = {
                id: '1234567890_linkedin_mock',
                email: 'mock_linkedin_user@example.com',
                name: 'Mock LinkedIn User',
                image: '',
                provider: 'linkedin'
            };
            return await handleSocialLogin(userData, res, req);
        }

        const origin = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
        const redirectUri = `${process.env.APP_URL || origin}/api/auth/linkedin/callback`;

        // 1. Exchange code for token
        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: config.linkedin.client_id,
            client_secret: config.linkedin.client_secret
        });

        const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', tokenParams.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenRes.data.access_token;

        // 2. Fetch User Profile
        const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userData = {
            id: profileRes.data.sub,
            email: profileRes.data.email,
            name: profileRes.data.name,
            image: profileRes.data.picture,
            provider: 'linkedin'
        };

        await handleSocialLogin(userData, res, req);
    } catch (err) {
        console.error('LinkedIn OAuth Error:', err.response?.data || err.message);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
};

// ─────────────────────────────────────────────
// Change Password
// PUT /api/auth/change-password
// ─────────────────────────────────────────────
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select('+password');

        if (!(await user.matchPassword(currentPassword))) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// Soft Delete Account
// DELETE /api/auth/delete-account
// ─────────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isDeleted = true;
        user.status = 'inactive';
        await user.save({ validateBeforeSave: false });

        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const imagePath = `/uploads/profiles/${req.file.filename}`;
        user.profile_image = imagePath;

        if (user.roles.includes('supplier') && !user.logo) {
            user.logo = imagePath;
        }

        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            message: 'Profile image updated successfully',
            profile_image: imagePath
        });
    } catch (error) {
        console.error('updateProfileImage error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// Forgot Password
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
    try {
        const email = String(req.body.email);
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User with this email does not exist' });
        }

        const otp = generateOTP();
        const otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.otp = otp;
        user.otp_expires = otp_expires;
        await user.save({ validateBeforeSave: false });

        // Send Forgot Password OTP - BYPASS QUEUE
        try {
            await sendMail({
                to: email,
                subject: 'Password Reset Code - Alibaba Demo',
                text: `Your password reset code is ${otp}. It expires in 10 minutes.`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #ff6600;">Password Reset Request</h2>
                        <p>We received a request to reset your password. Use the code below to proceed:</p>
                        <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                            ${otp}
                        </div>
                        <p>If you didn't request a password reset, please ignore this email.</p>
                    </div>
                `
            });
        } catch (mailErr) {
            console.error('Forgot Password Mail Error:', mailErr);
        }

        res.json({ success: true, message: 'Password reset code sent to your email' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// Become Supplier (Onboarding Flow)
// POST /api/auth/become-supplier
// Authenticated
// ─────────────────────────────────────────────
exports.becomeSupplier = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const {
            company_name, business_type, address_line1, city, state, zip_code,
            country, website, description, staff_size, annual_revenue,
            account_name, account_number, bank_name, ifsc_code, swift_code,
            tax_id, phone, phone_country
        } = req.body;

        const id_proof = req.file ? `/uploads/verification/${req.file.filename}` : '';

        user.company_name = company_name || user.company_name;
        user.business_type = business_type || user.business_type;
        user.address_line1 = address_line1 || user.address_line1;
        user.city = city || user.city;
        user.state = state || user.state;
        user.zip_code = zip_code || user.zip_code;
        user.phone_number = phone || user.phone_number;
        user.country_code = phone_country || user.country_code;

        // Upsert Company Profile
        const Company = require('../models/Company');
        await Company.findOneAndUpdate(
            { user_id: user._id },
            {
                user_id: user._id,
                company_name,
                business_type: Array.isArray(business_type) ? business_type.join(', ') : business_type,
                address: address_line1,
                city,
                state: state || '',
                country: country || '',
                website: website || '',
                description: description || '',
                staff_size: staff_size || '',
                annual_revenue: annual_revenue || '',
                tax_id: tax_id || '',
                phone: phone || '',
                phone_country: phone_country || '',
                id_proof: id_proof || '',
                document: id_proof || ''
            },
            { upsert: true, new: true, validateBeforeSave: false }
        );
        await user.save();

        // Add Bank Details if provided
        if (account_number && bank_name) {
            const newPayout = {
                type: 'bank',
                bank_name,
                account_name,
                account_number,
                ifsc_code,
                swift_code,
                is_default: true
            };
            user.payout_methods = [newPayout];
        }

        // Add supplier role if not present
        if (!user.roles.includes('supplier')) {
            user.roles.push('supplier');
        }

        user.status = 'profile_submitted';
        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            message: 'You have successfully registered as a supplier!',
            user: {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                roles: user.roles,
                company_name: user.company_name,
                status: user.status
            }
        });
    } catch (error) {
        console.error('becomeSupplier error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
// Reset Password
// POST /api/auth/reset-password
// ─────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const cleanEmail = email ? String(email) : '';

        const user = await User.findOne({ email: cleanEmail }).select('+otp +otp_expires');
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.otp !== otp) return res.status(400).json({ message: 'Invalid code' });
        if (user.otp_expires < Date.now()) return res.status(400).json({ message: 'Code has expired' });

        user.password = newPassword;
        user.otp = undefined;
        user.otp_expires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Stripe checkout session for wallet topup
// @route   POST /api/auth/wallet/topup/stripe
// @access  Private (Buyer)
exports.createWalletTopupSession = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Please specify a valid positive top-up amount.' });
        }

        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: 'stripe', enable: true });
        const stripeInstance = require('stripe')(settings?.secret_key || process.env.STRIPE_SECRET_KEY);
        
        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:9010';
        
        const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'B2B Wallet Balance Deposit',
                        description: `Deposit of $${parseFloat(amount).toFixed(2)} to buyer wallet`
                    },
                    unit_amount: Math.round(parseFloat(amount) * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${FRONTEND_URL}/buyer/dashboard/credit?session_id={CHECKOUT_SESSION_ID}&type=wallet_deposit`,
            cancel_url: `${FRONTEND_URL}/buyer/dashboard/credit?status=cancel`,
            client_reference_id: req.user._id.toString(),
            metadata: {
                type: 'wallet_deposit',
                amount: amount.toString()
            }
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Wallet topup session error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Verify Stripe wallet topup payment status and credit wallet
// @route   POST /api/auth/wallet/topup/verify
// @access  Private (Buyer)
exports.verifyWalletTopupSession = async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID is required.' });
        }

        const Transaction = require('../models/Transaction');
        
        // Prevent double processing if session already exists in Transaction description
        const exists = await Transaction.findOne({ description: new RegExp(sessionId) });
        if (exists) {
            // Already processed, return user's current wallet balance
            return res.json({ success: true, message: 'Already processed.', balance: req.user.wallet_balance });
        }

        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: 'stripe', enable: true });
        const stripeInstance = require('stripe')(settings?.secret_key || process.env.STRIPE_SECRET_KEY);
        
        const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status === 'paid' && session.metadata.type === 'wallet_deposit') {
            const amount = parseFloat(session.metadata.amount);
            
            const User = require('../models/User');
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            user.wallet_balance = parseFloat(((user.wallet_balance || 0) + amount).toFixed(2));
            await user.save();

            // Log Transaction
            await Transaction.create({
                user_id: user._id,
                type: 'credit',
                amount: amount,
                status: 'completed',
                description: `Simulated wallet top-up of $${amount} via Stripe. Session ID: ${sessionId}`
            });

            return res.json({ success: true, message: `Wallet topped up by $${amount} successfully.`, balance: user.wallet_balance });
        }
        
        res.status(400).json({ message: 'Stripe payment has not been completed.' });
    } catch (err) {
        console.error('Wallet topup verify error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Simulate wallet topup from modal
// @route   POST /api/auth/wallet/topup/simulate
// @access  Private (Buyer)
exports.simulateWalletTopup = async (req, res) => {
    try {
        const { amount, paymentMethod } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Please specify a valid positive top-up amount.' });
        }
        if (!paymentMethod) {
            return res.status(400).json({ message: 'Please specify a payment method.' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.wallet_balance = parseFloat(((user.wallet_balance || 0) + parseFloat(amount)).toFixed(2));
        await user.save();

        const Transaction = require('../models/Transaction');
        await Transaction.create({
            user_id: user._id,
            type: 'credit',
            amount: parseFloat(amount),
            status: 'completed',
            description: `Wallet top-up of $${parseFloat(amount).toFixed(2)} via ${paymentMethod}.`
        });

        res.json({ success: true, message: `Wallet topped up by $${parseFloat(amount).toFixed(2)} successfully.`, balance: user.wallet_balance });
    } catch (err) {
        console.error('Wallet topup simulate error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create PayPal order for wallet topup
// @route   POST /api/auth/wallet/topup/paypal
// @access  Private (Buyer)
exports.createWalletTopupPaypal = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Please specify a valid positive top-up amount.' });
        }

        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: 'paypal', enable: true });
        if (!settings) {
            return res.status(400).json({ message: 'PayPal is not enabled' });
        }

        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:9010';
        const isMock = !settings.public_key || !settings.secret_key ||
                       settings.public_key.includes('mock') || settings.secret_key.includes('mock');

        if (isMock) {
            const mockOrderId = `paypal_order_mock_${Date.now()}`;
            return res.json({
                url: `${FRONTEND_URL}/buyer/dashboard/credit?status=success&method=paypal&amount=${amount}&orderId=${mockOrderId}&is_mock=true`
            });
        }

        const paypal = require('@paypal/checkout-server-sdk');
        const clientId = settings.public_key;
        const clientSecret = settings.secret_key;
        const environment = settings.live_mode 
            ? new paypal.core.LiveEnvironment(clientId, clientSecret)
            : new paypal.core.SandboxEnvironment(clientId, clientSecret);
        const client = new paypal.core.PayPalHttpClient(environment);

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: parseFloat(amount).toFixed(2)
                },
                description: `B2B Wallet Balance Deposit of $${parseFloat(amount).toFixed(2)}`
            }],
            application_context: {
                return_url: `${FRONTEND_URL}/buyer/dashboard/credit?status=success&method=paypal&amount=${amount}`,
                cancel_url: `${FRONTEND_URL}/buyer/dashboard/credit?status=cancel`
            }
        });

        const order = await client.execute(request);
        const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
        res.json({ url: approvalUrl });
    } catch (err) {
        console.error('Wallet topup paypal session error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Verify PayPal wallet topup
// @route   POST /api/auth/wallet/topup/paypal/verify
// @access  Private (Buyer)
exports.verifyWalletTopupPaypal = async (req, res) => {
    try {
        const { orderId, amount } = req.body;
        if (!orderId) {
            return res.status(400).json({ message: 'Order ID is required.' });
        }

        const Transaction = require('../models/Transaction');
        const exists = await Transaction.findOne({ description: new RegExp(orderId) });
        if (exists) {
            return res.json({ success: true, message: 'Already processed.', balance: req.user.wallet_balance });
        }

        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: 'paypal', enable: true });
        if (!settings) return res.status(400).json({ message: 'PayPal not enabled' });

        const isMock = !settings.public_key || !settings.secret_key ||
                       settings.public_key.includes('mock') || settings.secret_key.includes('mock') ||
                       (orderId && orderId.startsWith('paypal_order_mock_'));

        if (isMock) {
            const User = require('../models/User');
            const user = await User.findById(req.user._id);
            user.wallet_balance = parseFloat(((user.wallet_balance || 0) + parseFloat(amount)).toFixed(2));
            await user.save();

            await Transaction.create({
                user_id: user._id,
                type: 'credit',
                amount: parseFloat(amount),
                status: 'completed',
                description: `Simulated wallet top-up of $${amount} via Mock PayPal. Order ID: ${orderId}`
            });

            return res.json({ success: true, message: 'Wallet topped up successfully via Mock PayPal.', balance: user.wallet_balance });
        }

        const paypal = require('@paypal/checkout-server-sdk');
        const environment = settings.live_mode
            ? new paypal.core.LiveEnvironment(settings.public_key, settings.secret_key)
            : new paypal.core.SandboxEnvironment(settings.public_key, settings.secret_key);
        const client = new paypal.core.PayPalHttpClient(environment);

        const getRequest = new paypal.orders.OrdersGetRequest(orderId);
        let orderDetail = await client.execute(getRequest);

        let status = orderDetail.result.status;
        if (status === 'APPROVED') {
            const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
            captureRequest.requestBody({});
            const capture = await client.execute(captureRequest);
            status = capture.result.status;
        }

        if (status === 'COMPLETED') {
            const User = require('../models/User');
            const user = await User.findById(req.user._id);
            user.wallet_balance = parseFloat(((user.wallet_balance || 0) + parseFloat(amount)).toFixed(2));
            await user.save();

            await Transaction.create({
                user_id: user._id,
                type: 'credit',
                amount: parseFloat(amount),
                status: 'completed',
                description: `Simulated wallet top-up of $${amount} via PayPal. Order ID: ${orderId}`
            });

            return res.json({ success: true, message: 'Wallet topped up successfully via PayPal.', balance: user.wallet_balance });
        } else {
            res.status(400).json({ message: `Payment not completed (Status: ${status})` });
        }
    } catch (err) {
        console.error('PayPal wallet verify error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create Razorpay order for wallet topup
// @route   POST /api/auth/wallet/topup/razorpay
// @access  Private (Buyer)
exports.createWalletTopupRazorpay = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Please specify a valid positive top-up amount.' });
        }

        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: 'razorpay', enable: true });
        if (!settings) {
            return res.status(400).json({ message: 'Razorpay is not enabled' });
        }

        const isMockKey = !settings.public_key || settings.public_key.includes('mock');

        if (isMockKey) {
            return res.json({
                id: `rzp_order_mock_${Date.now()}`,
                amount: Math.round(parseFloat(amount) * 100),
                currency: "INR",
                key: settings.public_key || "rzp_test_mock_key",
                is_mock: true
            });
        }

        const canCreateOrder = settings.secret_key && !settings.secret_key.includes('mock');

        if (canCreateOrder) {
            try {
                const Razorpay = require('razorpay');
                const instance = new Razorpay({
                    key_id: settings.public_key,
                    key_secret: settings.secret_key,
                });

                const options = {
                    amount: Math.round(parseFloat(amount) * 100),
                    currency: "INR",
                    receipt: `topup_${Date.now()}`,
                };

                const rzpOrder = await instance.orders.create(options);
                return res.json({
                    id: rzpOrder.id,
                    amount: rzpOrder.amount,
                    currency: rzpOrder.currency,
                    key: settings.public_key,
                    is_mock: false
                });
            } catch (err) {
                console.error('Failed to create real Razorpay order, falling back to standard checkout:', err);
            }
        }

        // Fallback: valid public key but no valid secret key to create order -> Standard Checkout
        res.json({
            id: `rzp_order_mock_${Date.now()}`,
            amount: Math.round(parseFloat(amount) * 100),
            currency: "INR",
            key: settings.public_key,
            is_mock: false,
            use_standard_checkout: true
        });
    } catch (err) {
        console.error('Wallet topup razorpay order error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Verify Razorpay wallet topup
// @route   POST /api/auth/wallet/topup/razorpay/verify
// @access  Private (Buyer)
exports.verifyWalletTopupRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
        const crypto = require('crypto');
        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: 'razorpay', enable: true });

        if (!settings) return res.status(400).json({ message: 'Razorpay is not enabled' });

        const isMock = !settings.public_key || !settings.secret_key ||
                       settings.public_key.includes('mock') || settings.secret_key.includes('mock') ||
                       (razorpay_order_id && razorpay_order_id.startsWith('rzp_order_mock_')) ||
                       !razorpay_signature;

        if (isMock) {
            const User = require('../models/User');
            const user = await User.findById(req.user._id);
            user.wallet_balance = parseFloat(((user.wallet_balance || 0) + parseFloat(amount)).toFixed(2));
            await user.save();

            const Transaction = require('../models/Transaction');
            await Transaction.create({
                user_id: user._id,
                type: 'credit',
                amount: parseFloat(amount),
                status: 'completed',
                description: `Simulated wallet top-up of $${amount} via Razorpay. Order ID: ${razorpay_order_id || 'N/A'}`
            });

            return res.json({ success: true, message: 'Wallet topped up successfully via Mock Razorpay.', balance: user.wallet_balance });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", settings.secret_key)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            const User = require('../models/User');
            const user = await User.findById(req.user._id);
            user.wallet_balance = parseFloat(((user.wallet_balance || 0) + parseFloat(amount)).toFixed(2));
            await user.save();

            const Transaction = require('../models/Transaction');
            await Transaction.create({
                user_id: user._id,
                type: 'credit',
                amount: parseFloat(amount),
                status: 'completed',
                description: `Simulated wallet top-up of $${amount} via Razorpay. Order ID: ${razorpay_order_id}`
            });

            res.json({ success: true, message: 'Wallet topped up successfully via Razorpay.', balance: user.wallet_balance });
        } else {
            res.status(400).json({ message: 'Invalid signature verification failed' });
        }
    } catch (err) {
        console.error('Razorpay wallet verify error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Daily check-in to earn AliExpress coins
// @route   POST /api/auth/check-in
// @access  Private
exports.dailyCheckIn = async (req, res) => {
    try {
        const User = require('../models/User');
        const LoyaltyTransaction = require('../models/LoyaltyTransaction');
        
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const now = new Date();
        const lastCheckIn = user.last_check_in;

        if (lastCheckIn) {
            const lastDate = new Date(lastCheckIn);
            if (
                lastDate.getDate() === now.getDate() &&
                lastDate.getMonth() === now.getMonth() &&
                lastDate.getFullYear() === now.getFullYear()
            ) {
                return res.status(400).json({ message: 'You have already checked in today! Come back tomorrow.' });
            }
        }

        const coinsAwarded = 10;
        user.coins = (user.coins || 0) + coinsAwarded;
        user.loyalty_points = (user.loyalty_points || 0) + coinsAwarded;
        user.last_check_in = now;
        await user.save({ validateBeforeSave: false });

        await LoyaltyTransaction.create({
            user: user._id,
            points: coinsAwarded,
            type: 'check_in',
            description: 'Daily check-in reward'
        });

        res.json({
            success: true,
            message: `Successfully checked in! You claimed ${coinsAwarded} AliExpress coins.`,
            coins: user.coins,
            loyalty_points: user.loyalty_points
        });
    } catch (err) {
        console.error('dailyCheckIn error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get all active user sessions / tracked devices
// @route   GET /api/auth/sessions
// @access  Private
exports.getSessions = async (req, res) => {
    try {
        const UserSession = require('../models/UserSession');
        const sessions = await UserSession.find({ user_id: req.user._id }).sort({ last_active: -1 });

        const mappedSessions = sessions.map(session => {
            const isCurrent = req.session_id && session._id.toString() === req.session_id.toString();
            return {
                _id: session._id,
                ip_address: session.ip_address,
                device_type: session.device_type,
                device_name: session.device_name,
                os: session.os,
                browser: session.browser,
                last_active: session.last_active,
                created_at: session.created_at,
                expires_at: session.expires_at,
                is_active: session.is_active,
                is_current: isCurrent
            };
        });

        res.json(mappedSessions);
    } catch (err) {
        console.error('getSessions error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Revoke a specific user session / logout device
// @route   DELETE /api/auth/sessions/:id
// @access  Private
exports.revokeSession = async (req, res) => {
    try {
        const { id } = req.params;
        const UserSession = require('../models/UserSession');
        
        const session = await UserSession.findOne({ _id: id, user_id: req.user._id });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        session.is_active = false;
        await session.save();
        res.json({ success: true, message: 'Session revoked successfully' });
    } catch (err) {
        console.error('revokeSession error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Revoke all other active sessions / logout all other devices
// @route   DELETE /api/auth/sessions/other
// @access  Private
exports.revokeOtherSessions = async (req, res) => {
    try {
        const UserSession = require('../models/UserSession');
        if (!req.session_id) {
            return res.status(400).json({ success: false, message: 'Current session ID not found' });
        }

        const updateResult = await UserSession.updateMany(
            { user_id: req.user._id, _id: { $ne: req.session_id } },
            { $set: { is_active: false } }
        );

        res.json({
            success: true,
            message: `Revoked ${updateResult.modifiedCount} other active sessions`
        });
    } catch (err) {
        console.error('revokeOtherSessions error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get referred users and status
// @route   GET /api/auth/referrals
// @access  Private
exports.getReferrals = async (req, res) => {
    try {
        const User = require('../models/User');
        const referredUsers = await User.find({ referred_by: req.user._id }).select('first_name last_name email createdAt');
        const Order = require('../models/Order');
        
        const referralsList = await Promise.all(referredUsers.map(async (u) => {
            const orderCount = await Order.countDocuments({ buyer_id: u._id, payment_status: 'paid' });
            return {
                _id: u._id,
                name: `${u.first_name} ${u.last_name}`,
                email: u.email.replace(/(..)(.*)(@.*)/, '$1***$3'), // Mask email for privacy
                joinedAt: u.createdAt,
                hasOrdered: orderCount > 0
            };
        }));
        
        res.json(referralsList);
    } catch (err) {
        console.error('getReferrals error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Share referral link via email
// @route   POST /api/auth/referrals/share
// @access  Private
exports.shareReferralCode = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Recipient email is required.' });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }
        
        if (email.toLowerCase() === req.user.email.toLowerCase()) {
            return res.status(400).json({ success: false, message: 'You cannot refer yourself.' });
        }
        
        const SiteSetting = require('../models/SiteSetting');
        const settings = await SiteSetting.findOne().select('site_name');
        const siteName = settings?.site_name || 'Alibaba Marketplace';
        
        const refCode = req.user._id.toString().substring(16);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:9010';
        const inviteUrl = `${frontendUrl}/?ref=${refCode}`;
        
        const { sendTemplatedMail } = require('../services/mailService');
        
        await sendTemplatedMail('referral-invite', email, {
            referrer_name: `${req.user.first_name} ${req.user.last_name}`,
            site_name: siteName,
            invite_url: inviteUrl,
            referral_code: refCode
        });
        
        res.json({ success: true, message: 'Invitation email sent successfully.' });
    } catch (err) {
        console.error('shareReferralCode error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
