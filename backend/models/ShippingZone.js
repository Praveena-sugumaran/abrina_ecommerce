const mongoose = require('mongoose');

const shippingZoneSchema = new mongoose.Schema(
    {
        warehouse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse',
            required: [true, 'Warehouse ID is required'],
            index: true
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            trim: true,
            index: true
        },
        state: {
            type: String,
            trim: true,
            index: true
        },
        city: {
            type: String,
            trim: true,
            index: true
        },
        delivery_time_days: {
            type: Number,
            required: [true, 'Delivery time in days is required']
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ShippingZone', shippingZoneSchema);
