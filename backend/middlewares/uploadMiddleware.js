const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'digital_file') {
        cb(null, true);
        return;
    }
    if (file.fieldname === 'three_d_model') {
        const allowedTypes = /glb|gltf/;
        const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extOk) {
            cb(null, true);
        } else {
            cb(new Error('Only 3D model files (glb, gltf) are allowed!'), false);
        }
        return;
    }
    if (file.fieldname === 'video') {
        const allowedTypes = /mp4|webm|ogg|mov/;
        const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extOk) {
            cb(null, true);
        } else {
            cb(new Error('Only video files (mp4, webm, ogg, mov) are allowed!'), false);
        }
        return;
    }
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowedTypes.test(file.mimetype);
    if (extOk && mimeOk) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (jpeg, jpg, png, webp, gif) are allowed!'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // Increase limits to 50MB to accommodate 3D models
});

// Allow up to 50 product images (Controller will enforce plan limits)
const uploadProductImages = upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'images', maxCount: 50 },
    { name: 'three_d_model', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'digital_file', maxCount: 1 }
]);

// ───────────────────────────────────────────────────────────────────────────
// COMPANY UPLOADS: Handle logo image and company document
// ───────────────────────────────────────────────────────────────────────────
const companyDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(companyDir)) fs.mkdirSync(companyDir, { recursive: true });

const companyStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, companyDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const companyFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (file.fieldname === 'logo' || file.fieldname === 'banner_image') {
        const isImg = /jpeg|jpg|png|webp|gif/.test(ext) && /jpeg|jpg|png|webp|gif/.test(mime);
        if (isImg) return cb(null, true);
        return cb(new Error(`${file.fieldname === 'logo' ? 'Logo' : 'Banner'} must be an image`), false);
    }
    if (file.fieldname === 'video') {
        const isVid = /mp4|webm|ogg|mov/.test(ext) || /mp4|webm|ogg|quicktime/.test(mime);
        if (isVid) return cb(null, true);
        return cb(new Error('Only video files (mp4, webm, ogg, mov) are allowed for company profile'), false);
    }
    // Documents: PDF, Word, Images
    const isDoc = /pdf|doc|docx|jpeg|jpg|png/.test(ext);
    if (isDoc) return cb(null, true);
    cb(new Error('Invalid document format. Use PDF, DOC, or image'), false);
};

const companyUpload = multer({
    storage: companyStorage,
    fileFilter: companyFileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const uploadCompanyFiles = companyUpload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'document', maxCount: 1 },
    { name: 'banner_image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]);

const uploadCsv = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, companyDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, 'bulk-' + Date.now() + ext);
        }
    }),
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowed = ['.csv', '.xlsx', '.xls'];
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV or Excel files are allowed'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('file');

const uploadRfqAttachments = upload.array('attachments', 5);

// ───────────────────────────────────────────────────────────────────────────
// CATEGORY UPLOAD: Handle single category image
// ───────────────────────────────────────────────────────────────────────────
const categoryDir = path.join(__dirname, '..', 'uploads', 'categories');
if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });

const categoryStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, categoryDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadCategoryImage = multer({
    storage: categoryStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('image');

const uploadProductMedia = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif|mp4|webm|ogg/;
        const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeOk = allowedTypes.test(file.mimetype);
        if (extOk && mimeOk) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and videos are allowed!'), false);
        }
    },
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB for videos
}).fields([
    { name: 'images', maxCount: 50 },
    { name: 'video', maxCount: 1 }
]);

const uploadSingleMedia = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif|mp4|webm|ogg/;
        const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeOk = allowedTypes.test(file.mimetype);
        if (extOk && mimeOk) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type!'), false);
        }
    },
    limits: { fileSize: 20 * 1024 * 1024 }
}).single('media');

// ───────────────────────────────────────────────────────────────────────────
// PROFILE UPLOAD: Handle single profile image
// ───────────────────────────────────────────────────────────────────────────
const profileDir = path.join(__dirname, '..', 'uploads', 'profiles');
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, profileDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadProfileImage = multer({
    storage: profileStorage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
}).single('profile_image');

const idProofDir = path.join(__dirname, '..', 'uploads', 'verification');
if (!fs.existsSync(idProofDir)) fs.mkdirSync(idProofDir, { recursive: true });

const idProofStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, idProofDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'id-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadIdProof = multer({
    storage: idProofStorage,
    fileFilter: companyFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('id_proof');

// Customization reference files
const customizationDir = path.join(__dirname, '..', 'uploads', 'customization');
if (!fs.existsSync(customizationDir)) fs.mkdirSync(customizationDir, { recursive: true });

const customizationStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, customizationDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'cust-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const customizationFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Allow images, PDFs, Docs, text, Excel
    const isAllowed = /jpeg|jpg|png|webp|gif|pdf|doc|docx|txt|xls|xlsx/.test(ext);
    if (isAllowed) return cb(null, true);
    cb(new Error('Invalid format. Use images, PDF, Word, Excel, or Text files'), false);
};

const uploadCustomizationFile = multer({
    storage: customizationStorage,
    fileFilter: customizationFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('reference_file');

// Enquiry attachments
const enquiryDir = path.join(__dirname, '..', 'uploads', 'enquiries');
if (!fs.existsSync(enquiryDir)) fs.mkdirSync(enquiryDir, { recursive: true });

const enquiryStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, enquiryDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'enq-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadEnquiryFile = multer({
    storage: enquiryStorage,
    fileFilter: customizationFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('attachment');

// Supplier Quotations
const quotationStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, customizationDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'quote-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadQuotationFile = multer({
    storage: quotationStorage,
    fileFilter: customizationFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
}).single('quotation_file');

// Custom field icons
const customFieldsDir = path.join(__dirname, '..', 'uploads', 'customfields');
if (!fs.existsSync(customFieldsDir)) fs.mkdirSync(customFieldsDir, { recursive: true });

const customFieldStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, customFieldsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'field-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadCustomFieldIcon = multer({
    storage: customFieldStorage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
}).single('icon');

module.exports = {
    uploadProductImages,
    uploadCompanyFiles,
    uploadCsv,
    uploadRfqAttachments,
    uploadCategoryImage,
    uploadProductMedia,
    uploadSingleMedia,
    uploadProfileImage,
    uploadIdProof,
    uploadCustomizationFile,
    uploadEnquiryFile,
    uploadQuotationFile,
    uploadCustomFieldIcon
};

