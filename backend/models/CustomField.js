const mongoose = require('mongoose');

const customFieldSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Field name is required'],
            unique: true,
            trim: true
        },
        type: {
            type: String,
            required: [true, 'Field type is required'],
            enum: ['text', 'number', 'select', 'textarea']
        },
        minLength: {
            type: Number,
            default: null
        },
        maxLength: {
            type: Number,
            default: null
        },
        options: [{
            type: String,
            trim: true
        }],
        categories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            index: true
        }],
        isRequired: {
            type: Boolean,
            default: false
        },
        showFilter: {
            type: Boolean,
            default: false
        },
        icon: {
            type: String,
            default: ''
        },
        order: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: {
                values: ['active', 'inactive'],
                message: '{VALUE} is not a valid status'
            },
            default: 'active',
            index: true,
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('CustomField', customFieldSchema);
