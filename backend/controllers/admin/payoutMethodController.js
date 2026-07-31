const PayoutMethod = require('../../models/PayoutMethod');

exports.getPayoutMethods = async (req, res) => {
    try {
        const methods = await PayoutMethod.find().sort({ createdAt: 1 });
        res.json(methods);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updatePayoutMethod = async (req, res) => {
    try {
        const { id } = req.params;
        const method = await PayoutMethod.findOneAndUpdate({ id }, req.body, { new: true, upsert: true });
        res.json(method);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.deletePayoutMethod = async (req, res) => {
    try {
        const { id } = req.params;
        await PayoutMethod.findOneAndDelete({ id });
        res.json({ message: 'Payout method deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.seedPayoutMethods = async (req, res) => {
    try {
        const demoMethods = [
            {
                id: 'bank_transfer',
                name: 'Bank Transfer',
                description: 'Withdrawal to local or international bank accounts',
                enabled: true,
                fields: [
                    { name: 'bank_name', label: 'Bank Name', type: 'text', placeholder: 'e.g. JP Morgan', required: true },
                    { name: 'account_name', label: 'Account Holder Name', type: 'text', placeholder: 'John Doe', required: true },
                    { name: 'account_number', label: 'Account Number / IBAN', type: 'text', placeholder: '1234567890', required: true },
                    { name: 'swift_code', label: 'SWIFT / BIC', type: 'text', placeholder: 'Optional for domestic', required: false }
                ]
            },
            {
                id: 'paypal',
                name: 'PayPal Payout',
                description: 'Direct payout to your PayPal account email',
                enabled: true,
                fields: [
                    { name: 'email', label: 'PayPal Email Address', type: 'text', placeholder: 'user@example.com', required: true }
                ]
            }
        ];

        for (const m of demoMethods) {
            await PayoutMethod.findOneAndUpdate({ id: m.id }, m, { upsert: true });
        }
        res.json({ message: 'Payout methods seeded' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
