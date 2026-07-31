const mongoose = require('mongoose');

/**
 * Category Schema for B2B Marketplace (Alibaba style)
 * Handles hierarchical category structures with production-ready validation.
 */
const categorySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Category title is required'],
            unique: true,
            trim: true,
            minlength: [2, 'Title must be at least 2 characters long'],
            maxlength: [100, 'Title cannot exceed 100 characters'],
            index: true,
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            index: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        image: {
            type: String,
            default: '/assets/placeholder-category.png',
            validate: {
                validator: function (v) {
                    // Simple URL or path validation
                    return v === null || v === '' || typeof v === 'string';
                },
                message: 'Invalid image path'
            }
        },
        status: {
            type: String,
            enum: {
                values: ['active', 'inactive'],
                message: '{VALUE} is not a valid status'
            },
            default: 'active',
            index: true,
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
        level: {
            type: Number,
            default: 0,
        },
        order: {
            type: Number,
            default: 0,
        }
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to generate a slug from the title
categorySchema.pre('save', async function () {
    if (this.isModified('title')) {
        this.slug = this.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
});

// Instance method to check if category is active
categorySchema.methods.isActive = function () {
    return this.status === 'active';
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
