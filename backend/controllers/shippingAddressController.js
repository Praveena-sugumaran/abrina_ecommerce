const ShippingAddress = require('../models/ShippingAddress');

exports.createAddress = async (req, res) => {
    try {
                const { fullName, phone, phoneCountry, addressLine, city, state, country, country_code, postalCode, isDefault, lat, lng } = req.body;

        if (!fullName || fullName.trim().length < 2) {
            return res.status(400).json({ message: 'Please enter a valid Full Name (at least 2 characters).' });
        }
        const cleanPhone = (phone || '').replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15) {
            return res.status(400).json({ message: 'Phone number must be a valid number between 7 and 15 digits.' });
        }
        if (!addressLine || !addressLine.trim()) {
            return res.status(400).json({ message: 'Street Address is required.' });
        }
        if (!country || !country.trim()) {
            return res.status(400).json({ message: 'Country is required.' });
        }
        if (!state || !state.trim()) {
            return res.status(400).json({ message: 'State / Province is required.' });
        }
        if (!city || !city.trim()) {
            return res.status(400).json({ message: 'City is required.' });
        }
        if (!postalCode || postalCode.trim().length < 3) {
            return res.status(400).json({ message: 'Please enter a valid Postal Code (at least 3 characters).' });
        }

        // If this is set as default, unset other defaults for this user
        if (isDefault) {
            await ShippingAddress.updateMany({ user: req.user._id }, { isDefault: false });
        }

        const addressCount = await ShippingAddress.countDocuments({ user: req.user._id });

        const address = new ShippingAddress({
            user: req.user._id,
            fullName,
            phone,
            phoneCountry,
            addressLine,
            city,
            state,
            country,
            country_code,
            postalCode,
            isDefault: isDefault || (addressCount === 0), // First address is default by default if not specified
            lat,
            lng
        });

        await address.save();
        res.status(201).json(address);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getAddresses = async (req, res) => {
    try {
        const addresses = await ShippingAddress.find({ user: req.user._id }).sort('-isDefault -createdAt');
        res.json(addresses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateAddress = async (req, res) => {
    try {
        const { fullName, phone, phoneCountry, addressLine, city, state, country, country_code, postalCode, isDefault, lat, lng } = req.body;

        if (fullName !== undefined && fullName.trim().length < 2) {
            return res.status(400).json({ message: 'Please enter a valid Full Name (at least 2 characters).' });
        }
        if (phone !== undefined) {
            const cleanPhone = (phone || '').replace(/\D/g, '');
            if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15) {
                return res.status(400).json({ message: 'Phone number must be a valid number between 7 and 15 digits.' });
            }
        }
        if (addressLine !== undefined && !addressLine.trim()) {
            return res.status(400).json({ message: 'Street Address cannot be empty.' });
        }
        if (country !== undefined && !country.trim()) {
            return res.status(400).json({ message: 'Country cannot be empty.' });
        }
        if (state !== undefined && !state.trim()) {
            return res.status(400).json({ message: 'State / Province cannot be empty.' });
        }
        if (city !== undefined && !city.trim()) {
            return res.status(400).json({ message: 'City cannot be empty.' });
        }
        if (postalCode !== undefined && postalCode.trim().length < 3) {
            return res.status(400).json({ message: 'Please enter a valid Postal Code (at least 3 characters).' });
        }

        const address = await ShippingAddress.findOne({ _id: req.params.id, user: req.user._id });
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        if (isDefault) {
            await ShippingAddress.updateMany({ user: req.user._id }, { isDefault: false });
        }

        address.fullName = fullName || address.fullName;
        address.phone = phone || address.phone;
        address.phoneCountry = phoneCountry || address.phoneCountry;
        address.addressLine = addressLine || address.addressLine;
        address.city = city || address.city;
        address.state = state || address.state;
        address.country = country || address.country;
        address.country_code = country_code !== undefined ? country_code : address.country_code;
        address.postalCode = postalCode || address.postalCode;
        address.isDefault = isDefault !== undefined ? isDefault : address.isDefault;
        address.lat = lat !== undefined ? lat : address.lat;
        address.lng = lng !== undefined ? lng : address.lng;

        await address.save();
        res.json(address);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const address = await ShippingAddress.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }
        
        // If we deleted the default address, set another one as default
        if (address.isDefault) {
             const nextAddress = await ShippingAddress.findOne({ user: req.user._id });
             if (nextAddress) {
                 nextAddress.isDefault = true;
                 await nextAddress.save();
             }
        }

        res.json({ message: 'Address deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.setDefault = async (req, res) => {
    try {
        await ShippingAddress.updateMany({ user: req.user._id }, { isDefault: false });
        const address = await ShippingAddress.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isDefault: true },
            { new: true }
        );
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }
        res.json(address);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
