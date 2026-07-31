const BillingAddress = require('../models/BillingAddress');

exports.createAddress = async (req, res) => {
    try {
        const { street, apartment, city, state, postalCode, country, phone, isDefault } = req.body;

        // If this is set as default, unset other defaults for this user
        if (isDefault) {
            await BillingAddress.updateMany({ user: req.user._id }, { isDefault: false });
        }

        const address = new BillingAddress({
            user: req.user._id,
            street,
            apartment,
            city,
            state,
            postalCode,
            country,
            phone,
            isDefault
        });

        await address.save();
        res.status(201).json(address);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getAddresses = async (req, res) => {
    try {
        const addresses = await BillingAddress.find({ user: req.user._id }).sort('-isDefault -createdAt');
        res.json(addresses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateAddress = async (req, res) => {
    try {
        const { street, apartment, city, state, postalCode, country, phone, isDefault } = req.body;

        const address = await BillingAddress.findOne({ _id: req.params.id, user: req.user._id });
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        if (isDefault) {
            await BillingAddress.updateMany({ user: req.user._id }, { isDefault: false });
        }

        address.street = street || address.street;
        address.apartment = apartment !== undefined ? apartment : address.apartment;
        address.city = city || address.city;
        address.state = state || address.state;
        address.postalCode = postalCode || address.postalCode;
        address.country = country || address.country;
        address.phone = phone || address.phone;
        address.isDefault = isDefault !== undefined ? isDefault : address.isDefault;

        await address.save();
        res.json(address);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const address = await BillingAddress.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }
        res.json({ message: 'Address deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
