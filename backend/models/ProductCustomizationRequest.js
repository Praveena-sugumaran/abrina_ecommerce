const mongoose = require('mongoose');

const productCustomizationRequestSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product reference is required'],
            index: true
        },
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Supplier reference is required'],
            index: true
        },
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Buyer reference is required'],
            index: true
        },
        buyer_name: {
            type: String,
            required: [true, 'Buyer name is required'],
            trim: true
        },
        buyer_email: {
            type: String,
            required: [true, 'Buyer email is required'],
            trim: true
        },
        buyer_phone: {
            type: String,
            required: [true, 'Buyer phone number is required'],
            trim: true
        },
        customization_type: {
            type: String,
            required: [true, 'Customization type is required'],
            trim: true
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1']
        },
        customization_details: {
            type: String,
            required: [true, 'Customization details are required'],
            trim: true
        },
        reference_file: {
            type: String,
            trim: true
        },
        expected_delivery_date: {
            type: Date,
            required: [true, 'Expected delivery date is required']
        },
        budget_range: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed'],
            default: 'pending',
            index: true
        },
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation'
        }
    },
    {
        timestamps: true
    }
);

const ProductCustomizationRequest = mongoose.model(
    'ProductCustomizationRequest',
    productCustomizationRequestSchema
);

module.exports = ProductCustomizationRequest;
