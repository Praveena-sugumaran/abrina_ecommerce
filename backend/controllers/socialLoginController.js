const SocialLogin = require('../models/SocialLogin');

// GET /api/admin/social-login — fetch current config
exports.getSocialLogin = async (req, res) => {
    try {
        let config = await SocialLogin.findOne();
        if (!config) {
            config = await SocialLogin.create({});
        }
        res.json(config);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/admin/social-login — update config (admin only)
exports.updateSocialLogin = async (req, res) => {
    try {
        const { google, facebook, linkedin } = req.body;
        let config = await SocialLogin.findOne();
        if (!config) config = new SocialLogin();

        if (google !== undefined) config.google = { ...config.google.toObject(), ...google };
        if (facebook !== undefined) config.facebook = { ...config.facebook.toObject(), ...facebook };
        if (linkedin !== undefined) config.linkedin = { ...config.linkedin.toObject(), ...linkedin };

        await config.save();
        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/social-login/public — returns only enabled flags (no secrets) — public endpoint
exports.getSocialLoginPublic = async (req, res) => {
    try {
        let config = await SocialLogin.findOne();
        if (!config) return res.json({ google: false, facebook: false, linkedin: false });

        res.json({
            google: config.google?.enabled || false,
            facebook: config.facebook?.enabled || false,
            linkedin: config.linkedin?.enabled || false,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
