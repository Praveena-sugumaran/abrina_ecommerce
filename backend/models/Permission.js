const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    module_name: {
        type: String,
        required: true
    },
    permission_name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Permission', permissionSchema);
