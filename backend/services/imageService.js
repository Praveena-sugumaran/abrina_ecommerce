const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Optimize an uploaded image file on disk.
 * Convert to WebP, resize for max 1200px boundary, and generate a 150px thumbnail.
 * Cleans up the original file.
 * 
 * @param {Object} file Multer file object
 * @returns {Promise<Object>} Object containing optimized url and thumbnail_url
 */
exports.optimizeImage = async (file) => {
    if (!file) return null;
    
    const originalPath = file.path;
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Only process images
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(ext);
    if (!isImage) {
        // Return original path relative to uploads if it's a 3D model or non-image
        return {
            url: `/uploads/products/${file.filename}`,
            thumbnail_url: `/uploads/products/${file.filename}`
        };
    }
    
    try {
        const uploadDir = path.dirname(originalPath);
        const baseName = path.basename(originalPath, ext);
        
        const optimizedFileName = `${baseName}.webp`;
        const thumbnailFileName = `${baseName}.thumb.webp`;
        
        const optimizedPath = path.join(uploadDir, optimizedFileName);
        const thumbnailPath = path.join(uploadDir, thumbnailFileName);
        
        // 1. Optimize and resize main image (1200px max, WebP, 80% quality)
        await sharp(originalPath)
            .resize({
                width: 1200,
                height: 1200,
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .toFile(optimizedPath);
            
        // 2. Generate optimized thumbnail (150px x 150px, WebP, 75% quality)
        await sharp(originalPath)
            .resize(150, 150, {
                fit: 'cover'
            })
            .webp({ quality: 75 })
            .toFile(thumbnailPath);
            
        // 3. Clean up the original file safely
        if (fs.existsSync(originalPath)) {
            fs.unlinkSync(originalPath);
        }
        
        return {
            url: `/uploads/products/${optimizedFileName}`,
            thumbnail_url: `/uploads/products/${thumbnailFileName}`
        };
    } catch (err) {
        console.error('Error optimizing image:', err);
        // Fallback to original file if sharp fails
        return {
            url: `/uploads/products/${file.filename}`,
            thumbnail_url: `/uploads/products/${file.filename}`
        };
    }
};
