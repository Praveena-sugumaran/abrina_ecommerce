import React, { useState, useEffect, useRef } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { createProduct, updateProduct } from '@/services/productApi';
import { getImgUrl } from '@/utils/imageConfig';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useToast } from '@/context/ToastContext';

import styles from './ProductManagement.module.css';

interface PriceTier {
    min_quantity: string | number;
    max_quantity: string | number | null;
    price: string | number;
    discount_percentage?: number;
}

interface VariantAttribute {
    name: string;
    value: string;
}

interface Variant {
    sku?: string;
    attributes: VariantAttribute[];
    price: string | number | null;
    stock: number;
    image?: string;
    images?: string[];
}

interface Attribute {
    key: string;
    value: string;
}

interface Country {
    name: string;
    code: string;
}

interface Product {
    _id?: string;
    name: string;
    description: string;
    category: any;
    sku: string;
    moq: number;
    currency: string;
    countInStock: number;
    status: string;
    oldPrice: number;
    price: number;
    sale_price?: number | null;
    main_price?: number;
    main_image?: string;
    images?: string[];
    video?: string;
    sample_available?: boolean;
    sample_price?: number;
    customization_available?: boolean;
    customization_options?: string[];
    price_tiers?: PriceTier[];
    variants?: Variant[];
    key_attributes?: Attribute[];
    sales_type?: 'worldwide' | 'specific';
    countries?: string[];
    three_d_model?: string;
    barcode?: string;
    rating?: number;
    numOrders?: number;
    features?: string[];
    isDigital?: boolean;
    digitalFile?: string;
    images_metadata?: any;
    dropshipping_supported?: boolean;
    gift_wrap_supported?: boolean;
    emi_supported?: boolean;
}

interface ProductFormProps {
    product?: Product | null;
    onSave: () => void;
    onCancel: () => void;
}

const emptyVariantAttribute = (): VariantAttribute => ({ name: '', value: '' });
const emptyVariant = (): Variant => ({
    sku: '',
    attributes: [emptyVariantAttribute()],
    price: '',
    stock: 0,
    image: '',
    images: []
});
const emptyAttribute = (): Attribute => ({ key: '', value: '' });
const emptyTier = (): PriceTier => ({ min_quantity: '', max_quantity: '', price: '' });

const ProductForm: React.FC<ProductFormProps> = ({ product, onSave, onCancel }) => {
    const isEdit = !!product;
    const coverFileInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuth();
    const maxImages = user?.subscription_plan?.max_images_per_product || 5;

    // Basic fields
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [category, setCategory] = useState<string>(product?.category?._id || product?.category || '');
    const [sku, setSku] = useState(product?.sku || '');
    const [barcode, setBarcode] = useState(product?.barcode || '');
    const [moq, setMoq] = useState<string | number>(1); // Silently defaulted to 1 for B2C
    const [currency, setCurrency] = useState(product?.currency || 'USD');
    const [countInStock, setCountInStock] = useState<string | number>(product ? (product.countInStock ?? 0) : -1);
    const [status, setStatus] = useState(product?.status || 'draft');
    const [oldPrice, setOldPrice] = useState<string | number>(product?.oldPrice || 0);
    const [price, setPrice] = useState<string | number>(product?.price || product?.main_price || product?.price_tiers?.[0]?.price || '');
    const [salePrice, setSalePrice] = useState<string | number>(product?.sale_price || '');
    const [rating, setRating] = useState<string | number>(product?.rating ?? 0);
    const [numOrders, setNumOrders] = useState<string | number>(product?.numOrders ?? 0);
    const [video, setVideo] = useState(product?.video || '');
    const [features, setFeatures] = useState<string[]>(
        product?.features?.length ? [...product.features] : ['']
    );
    const [sampleAvailable, setSampleAvailable] = useState(false);
    const [samplePrice, setSamplePrice] = useState<string | number>(0);
    const [customizationAvailable, setCustomizationAvailable] = useState(false);
    const [customizationOptions, setCustomizationOptions] = useState<string[]>([]);
    const [newOption, setNewOption] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState(0);

    // Digital Product States
    const [isDigital, setIsDigital] = useState(product?.isDigital || false);
    const [digitalFile, setDigitalFile] = useState<File | null>(null);
    const [existingDigitalFile, setExistingDigitalFile] = useState(product?.digitalFile || '');

    // Dropshipping & Gift Wrap Configuration States
    const [dropshippingSupported, setDropshippingSupported] = useState(
        product?.dropshipping_supported !== undefined ? product.dropshipping_supported : true
    );
    const [giftWrapSupported, setGiftWrapSupported] = useState(
        product?.gift_wrap_supported !== undefined ? product.gift_wrap_supported : true
    );
    const [giftWrapFee, setGiftWrapFee] = useState<string | number>(
        product?.gift_wrap_fee !== undefined && product?.gift_wrap_fee !== null ? product.gift_wrap_fee : ''
    );
    const [emiSupported, setEmiSupported] = useState(
        product?.emi_supported !== undefined ? product.emi_supported : true
    );

    // Sales Region State
    const [salesType, setSalesType] = useState(product?.sales_type || 'worldwide');
    const [selectedCountries, setSelectedCountries] = useState<string[]>(product?.countries || []);
    const [allCountries, setAllCountries] = useState<Country[]>([]);
    const [countrySearchTerm, setCountrySearchTerm] = useState('');
    const [showCountryOptions, setShowCountryOptions] = useState(false);

    // Initial calculation of discount percentage if editing
    useEffect(() => {
        if (isEdit && product) {
            const p = product.price || product.main_price || product.price_tiers?.[0]?.price || 0;
            const s = product.sale_price || 0;
            if (+p > 0 && +s > 0 && +p > +s) {
                setDiscountPercentage(Math.round(((+p - +s) / +p) * 100));
            }
        }
    }, [isEdit, product]);

    const handlePriceChange = (val: string) => {
        setPrice(val);
        const p = parseFloat(val) || 0;
        const s = parseFloat(String(salePrice)) || 0;
        if (p > 0 && s > 0 && p > s) {
            setDiscountPercentage(Math.round(((p - s) / p) * 100));
        } else {
            setDiscountPercentage(0);
        }
    };

    const handleSalePriceChange = (val: string) => {
        setSalePrice(val);
        const s = parseFloat(val) || 0;
        const p = parseFloat(String(price)) || 0;
        if (p > 0 && s > 0 && p > s) {
            setDiscountPercentage(Math.round(((p - s) / p) * 100));
        } else {
            setDiscountPercentage(0);
        }
    };

    const [variants, setVariants] = useState<Variant[]>(
        product?.variants?.length
            ? product.variants.map(v => ({
                ...v,
                attributes: v.attributes.map(a => ({ ...a })),
                images: v.images ? [...v.images] : []
            }))
            : []
    );

    // Key Attributes
    const [keyAttributes, setKeyAttributes] = useState<Attribute[]>(
        product?.key_attributes?.length ? product.key_attributes.map(k => ({ ...k })) : []
    );

    // Custom Fields (category-based dynamic fields)
    const [customFields, setCustomFields] = useState<any[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

    // Initial calculation of discount percentage if editing
    useEffect(() => {
        if (isEdit && product && product.oldPrice > 0) {
            const currentPrice = product.main_price || product.price_tiers?.[0]?.price || 0;
            if (product.oldPrice > +currentPrice) {
                setDiscountPercentage(Math.round(((product.oldPrice - +currentPrice) / product.oldPrice) * 100));
            }
        }
    }, [isEdit, product]);

    const handleDiscountChange = (pct: string) => {
        const val = parseFloat(pct) || 0;
        setDiscountPercentage(val);
        const firstTierPrice = tiers[0]?.price;
        const currentPrice = typeof firstTierPrice === 'string' ? parseFloat(firstTierPrice) : (firstTierPrice || 0);
        if (val > 0 && currentPrice > 0) {
            const calculatedOldPrice = (currentPrice / (1 - val / 100)).toFixed(2);
            setOldPrice(calculatedOldPrice);
        } else if (val === 0) {
            setOldPrice(0);
        }
    };

    const handleOldPriceChange = (oldPriceVal: string) => {
        const val = parseFloat(oldPriceVal) || 0;
        setOldPrice(val);
        const currentPrice = parseFloat(String(price)) || 0;
        if (val > currentPrice && val > 0) {
            setDiscountPercentage(Math.round(((val - currentPrice) / val) * 100));
        } else {
            setDiscountPercentage(0);
        }
    };

    // Pricing tiers
    const [tiers, setTiers] = useState<PriceTier[]>(
        product?.price_tiers?.length ? product.price_tiers.map(t => ({ ...t })) : [emptyTier()]
    );



    // Images
    const [existingCoverImage, setExistingCoverImage] = useState(product && product.main_image ? product.main_image : (product?.images?.length ? product.images[0] : ''));
    const [coverImageAlt, setCoverImageAlt] = useState(() => {
        if (!product) return '';
        const match = product.images_metadata?.find((m: any) => m.url === product.main_image);
        return match ? match.alt : '';
    });
    const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
    const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);

    // 3D Model
    const [existingThreeDModel, setExistingThreeDModel] = useState(product?.three_d_model || '');
    const [threeDModelFile, setThreeDModelFile] = useState<File | null>(null);
    const [threeDModelFileName, setThreeDModelFileName] = useState('');
    const threeDModelInputRef = useRef<HTMLInputElement>(null);

    const [existingImagesMetadata, setExistingImagesMetadata] = useState<Array<{ url: string, alt: string }>>(() => {
        if (!product) return [];
        const cover = product.main_image || (product.images?.length ? product.images[0] : '');
        const additionalUrls = product.images
            ? product.images.filter(img => img !== cover)
            : [];

        return additionalUrls.map(url => {
            const match = product.images_metadata?.find((m: any) => m.url === url);
            return {
                url,
                alt: match ? match.alt : ''
            };
        });
    });
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);
    const [newImagesAlts, setNewImagesAlts] = useState<string[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [dragOverCover, setDragOverCover] = useState(false);

    // Selection for bulk delete
    const [selectedExistingIndices, setSelectedExistingIndices] = useState<number[]>([]);
    const [selectedNewIndices, setSelectedNewIndices] = useState<number[]>([]);

    // Drag-and-Drop Reordering state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [draggedIsNew, setDraggedIsNew] = useState<boolean | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number, isNew: boolean) => {
        setDraggedIndex(index);
        setDraggedIsNew(isNew);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number, isNewTarget: boolean) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIsNew === null) return;

        if (draggedIsNew === isNewTarget) {
            if (isNewTarget) {
                setNewFiles(prev => {
                    const next = [...prev];
                    const [dragged] = next.splice(draggedIndex, 1);
                    next.splice(targetIndex, 0, dragged);
                    return next;
                });
                setNewPreviews(prev => {
                    const next = [...prev];
                    const [dragged] = next.splice(draggedIndex, 1);
                    next.splice(targetIndex, 0, dragged);
                    return next;
                });
                setNewImagesAlts(prev => {
                    const next = [...prev];
                    const [dragged] = next.splice(draggedIndex, 1);
                    next.splice(targetIndex, 0, dragged);
                    return next;
                });
            } else {
                setExistingImagesMetadata(prev => {
                    const next = [...prev];
                    const [dragged] = next.splice(draggedIndex, 1);
                    next.splice(targetIndex, 0, dragged);
                    return next;
                });
            }
        }
        setDraggedIndex(null);
        setDraggedIsNew(null);
    };

    // Bulk deletion
    const deleteSelectedImages = () => {
        if (selectedExistingIndices.length > 0) {
            setExistingImagesMetadata(prev => prev.filter((_, i) => !selectedExistingIndices.includes(i)));
            setSelectedExistingIndices([]);
        }
        if (selectedNewIndices.length > 0) {
            setNewFiles(prev => prev.filter((_, i) => !selectedNewIndices.includes(i)));
            setNewPreviews(prev => prev.filter((_, i) => !selectedNewIndices.includes(i)));
            setNewImagesAlts(prev => prev.filter((_, i) => !selectedNewIndices.includes(i)));
            setSelectedNewIndices([]);
        }
    };

    // Set Primary / Featured Cover
    const setPrimaryExisting = (idx: number) => {
        const target = existingImagesMetadata[idx];
        const oldCover = existingCoverImage;
        const oldCoverAlt = coverImageAlt;

        setExistingCoverImage(target.url);
        setCoverImageAlt(target.alt);
        setNewCoverFile(null);
        setNewCoverPreview(null);

        setExistingImagesMetadata(prev => {
            const filtered = prev.filter((_, i) => i !== idx);
            if (oldCover) {
                filtered.unshift({ url: oldCover, alt: oldCoverAlt });
            }
            return filtered;
        });
    };

    const setPrimaryNew = (idx: number) => {
        const targetFile = newFiles[idx];
        const targetPreview = newPreviews[idx];
        const targetAlt = newImagesAlts[idx];

        const oldCover = existingCoverImage;
        const oldCoverAlt = coverImageAlt;
        const oldCoverFile = newCoverFile;
        const oldCoverPreview = newCoverPreview;

        setNewCoverFile(targetFile);
        setNewCoverPreview(targetPreview);
        setCoverImageAlt(targetAlt);
        setExistingCoverImage('');

        setNewFiles(prev => prev.filter((_, i) => i !== idx));
        setNewPreviews(prev => prev.filter((_, i) => i !== idx));
        setNewImagesAlts(prev => prev.filter((_, i) => i !== idx));

        if (oldCoverPreview && oldCoverFile) {
            setNewFiles(prev => [oldCoverFile, ...prev]);
            setNewPreviews(prev => [oldCoverPreview, ...prev]);
            setNewImagesAlts(prev => [oldCoverAlt, ...prev]);
        } else if (oldCover) {
            setExistingImagesMetadata(prev => [{ url: oldCover, alt: oldCoverAlt }, ...prev]);
        }
    };

    // Selection helper
    const toggleSelectExisting = (idx: number) => {
        setSelectedExistingIndices(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    const toggleSelectNew = (idx: number) => {
        setSelectedNewIndices(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    // Variant multi-image drag-drop reordering state
    const [draggedVarIdx, setDraggedVarIdx] = useState<number | null>(null);
    const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);

    const handleVarDragStart = (variantIdx: number, imageIdx: number) => {
        setDraggedVarIdx(variantIdx);
        setDraggedImgIdx(imageIdx);
    };

    const handleVarDrop = (variantIdx: number, targetImageIdx: number) => {
        if (draggedVarIdx !== variantIdx || draggedImgIdx === null) return;

        const currentImages = [...(variants[variantIdx].images || [])];
        const [dragged] = currentImages.splice(draggedImgIdx, 1);
        currentImages.splice(targetImageIdx, 0, dragged);

        updateVariant(variantIdx, 'images', currentImages);
        if (currentImages.length > 0) {
            updateVariant(variantIdx, 'image', currentImages[0]);
        }

        setDraggedVarIdx(null);
        setDraggedImgIdx(null);
    };

    const removeVariantImage = (variantIdx: number, imageIdx: number) => {
        const currentImages = variants[variantIdx].images || [];
        const targetImg = currentImages[imageIdx];
        const updatedImages = currentImages.filter((_, i) => i !== imageIdx);

        updateVariant(variantIdx, 'images', updatedImages);
        if (variants[variantIdx].image === targetImg) {
            updateVariant(variantIdx, 'image', updatedImages.length > 0 ? updatedImages[0] : '');
        }
    };

    const setPrimaryVariantImage = (variantIdx: number, imageIdx: number) => {
        const currentImages = variants[variantIdx].images || [];
        const targetImg = currentImages[imageIdx];
        updateVariant(variantIdx, 'image', targetImg);
        const filtered = currentImages.filter((_, i) => i !== imageIdx);
        updateVariant(variantIdx, 'images', [targetImg, ...filtered]);
    };

    const copyVariantImages = (targetIdx: number, sourceIdx: number) => {
        if (sourceIdx < 0 || sourceIdx >= variants.length) return;
        const srcImages = variants[sourceIdx].images || [];
        const srcImage = variants[sourceIdx].image || '';

        updateVariant(targetIdx, 'images', [...srcImages]);
        updateVariant(targetIdx, 'image', srcImage);
        showToast(`Copied images from Combination #${sourceIdx + 1}!`, 'success');
    };

    // Cropper State
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | undefined>(undefined);
    const [cropImageIndex, setCropImageIndex] = useState<'cover' | number | null>(null);
    const [crop, setCrop] = useState<any>({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
    const [completedCrop, setCompletedCrop] = useState<any>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Categories
    const [categories, setCategories] = useState<any[]>([]);
    const [parentCategory, setParentCategory] = useState('');
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { showToast } = useToast();
    const [isMobile, setIsMobile] = useState(false);

    // Form tab states and helpers
    const [activeFormTab, setActiveFormTab] = useState<'general' | 'pricing' | 'specs' | 'media'>('general');

    const handleNextTab = () => {
        if (activeFormTab === 'general') setActiveFormTab('pricing');
        else if (activeFormTab === 'pricing') setActiveFormTab('specs');
        else if (activeFormTab === 'specs') setActiveFormTab('media');
    };

    const handlePrevTab = () => {
        if (activeFormTab === 'pricing') setActiveFormTab('general');
        else if (activeFormTab === 'specs') setActiveFormTab('pricing');
        else if (activeFormTab === 'media') setActiveFormTab('specs');
    };

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        api.get('/categories').then(({ data }) => {
            const tree = Array.isArray(data) ? data : data.categories || [];
            setCategories(tree);

            // If editing, find the parent of the currently selected category
            if (isEdit && category) {
                const findParentId = (list: any[]): string | null => {
                    for (const cat of list) {
                        if (cat._id === category) return null;
                        if (cat.children && cat.children.some((child: any) => child._id === category)) {
                            return cat._id;
                        }
                        const nested = findParentId(cat.children || []);
                        if (nested) return nested;
                    }
                    return null;
                };

                const pId = findParentId(tree);
                if (pId) {
                    setParentCategory(pId);
                    const parentObj = tree.find((c: any) => c._id === pId);
                    setSubCategories(parentObj?.children || []);
                } else {
                    setParentCategory(category);
                }
            }
        }).catch(() => { });

        // Fetch All Countries
        api.get('/common/countries').then(({ data }) => {
            setAllCountries(data || []);
        }).catch(() => { });
    }, [isEdit, category]);

    // Fetch custom fields when category changes
    useEffect(() => {
        if (!category) {
            setCustomFields([]);
            setCustomFieldValues({});
            return;
        }
        api.get(`/custom-fields/category/${category}`)
            .then(({ data }) => {
                setCustomFields(data || []);
                // Pre-populate custom field values from existing product key_attributes
                if (isEdit && product?.key_attributes?.length) {
                    const existingVals: Record<string, string> = {};
                    for (const cf of (data || [])) {
                        const match = product.key_attributes.find((a: any) => a.key === cf.name);
                        if (match) existingVals[cf.name] = match.value;
                    }
                    setCustomFieldValues(existingVals);
                }
            })
            .catch(() => setCustomFields([]));
    }, [category]);

    const handleParentChange = (pId: string) => {
        setParentCategory(pId);
        const parentObj = categories.find(c => c._id === pId);
        const children = parentObj?.children || [];
        setSubCategories(children);
        setCategory(pId);
    };

    const handleSubChange = (sId: string) => {
        setCategory(sId || parentCategory);
    };

    const handleCoverSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const f = files[0];
        const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target?.result as string);
            reader.readAsDataURL(f);
        });
        setNewCoverFile(f);
        setNewCoverPreview(dataUrl);
        // Force crop on cover image
        setTimeout(() => {
            handleCropOpen('cover', dataUrl);
        }, 100);
    };

    const handleFileSelect = async (files: FileList | null) => {
        if (!files) return;
        const remaining = maxImages - 1 - existingImagesMetadata.length - newFiles.length; // -1 for cover
        if (remaining <= 0) return;
        const arr = Array.from(files).slice(0, remaining);

        const tempFiles: File[] = [];
        const tempPreviews: string[] = [];
        const tempAlts: string[] = [];

        for (let i = 0; i < arr.length; i++) {
            const f = arr[i];
            const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target?.result as string);
                reader.readAsDataURL(f);
            });
            tempFiles.push(f);
            tempPreviews.push(dataUrl);
            tempAlts.push('');
        }

        setNewFiles(prev => [...prev, ...tempFiles]);
        setNewPreviews(prev => [...prev, ...tempPreviews]);
        setNewImagesAlts(prev => [...prev, ...tempAlts]);
    };

    const handleKeyDownOption = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addOption();
        }
    };

    const removeExistingCover = () => {
        setExistingCoverImage('');
        setCoverImageAlt('');
        setNewCoverFile(null);
        setNewCoverPreview(null);
    };
    const removeNewCover = () => {
        setNewCoverFile(null);
        setNewCoverPreview(null);
        setCoverImageAlt('');
    };
    const removeExisting = (idx: number) => {
        setExistingImagesMetadata(prev => prev.filter((_, i) => i !== idx));
        setSelectedExistingIndices(prev => prev.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
    };
    const removeNew = (idx: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== idx));
        setNewPreviews(prev => prev.filter((_, i) => i !== idx));
        setNewImagesAlts(prev => prev.filter((_, i) => i !== idx));
        setSelectedNewIndices(prev => prev.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
    };

    const updateVariant = (idx: number, field: keyof Variant, val: any) => setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: val } : v));
    const removeVariant = (idx: number) => setVariants(prev => prev.filter((_, i) => i !== idx));
    const addVariantAttribute = (variantIdx: number) => {
        setVariants(prev => prev.map((v, i) => {
            if (i === variantIdx) {
                return {
                    ...v,
                    attributes: [...v.attributes, emptyVariantAttribute()]
                };
            }
            return v;
        }));
    };
    const updateVariantAttribute = (variantIdx: number, attrIdx: number, field: keyof VariantAttribute, val: string) => {
        setVariants(prev => prev.map((v, i) => {
            if (i === variantIdx) {
                const newAttrs = v.attributes.map((attr, j) => {
                    if (j === attrIdx) {
                        return { ...attr, [field]: val };
                    }
                    return attr;
                });
                return { ...v, attributes: newAttrs };
            }
            return v;
        }));
    };
    const removeVariantAttribute = (variantIdx: number, attrIdx: number) => {
        setVariants(prev => prev.map((v, i) => {
            if (i === variantIdx) {
                return {
                    ...v,
                    attributes: v.attributes.filter((_, j) => j !== attrIdx)
                };
            }
            return v;
        }));
    };
    const updateAttribute = (idx: number, field: keyof Attribute, val: any) => setKeyAttributes(prev => prev.map((a, i) => i === idx ? { ...a, [field]: val } : a));
    const removeAttribute = (idx: number) => setKeyAttributes(prev => prev.filter((_, i) => i !== idx));
    const addFeature = () => setFeatures(prev => [...prev, '']);
    const updateFeature = (idx: number, val: string) => setFeatures(prev => prev.map((f, i) => i === idx ? val : f));
    const removeFeature = (idx: number) => setFeatures(prev => prev.filter((_, i) => i !== idx));
    const addOption = () => { if (newOption.trim()) { setCustomizationOptions(prev => [...prev, newOption.trim()]); setNewOption(''); } };
    const removeOption = (idx: number) => setCustomizationOptions(prev => prev.filter((_, i) => i !== idx));

    const [uploadingVariantIdx, setUploadingVariantIdx] = useState<number | null>(null);

    const handleVideoUpload = async (file: File | null) => {
        if (!file) return;
        const fd = new FormData();
        fd.append('media', file);
        setVideoLoading(true);
        try {
            const { data } = await api.post('/products/upload-media', fd);
            if (data.success) {
                setVideo(data.url);
            }
        } catch (err) {
            setError('Failed to upload video.');
        } finally {
            setVideoLoading(false);
        }
    };

    const handleVariantMultipleImagesUpload = async (idx: number, files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploadingVariantIdx(idx);
        try {
            const urls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const fd = new FormData();
                fd.append('images', files[i]);
                const { data } = await api.post('/products/upload-single', fd);
                if (data.success) {
                    urls.push(data.url);
                }
            }
            const currentImages = variants[idx].images || [];
            const updatedImages = [...currentImages, ...urls];
            updateVariant(idx, 'images', updatedImages);
            if (!variants[idx].image && updatedImages.length > 0) {
                updateVariant(idx, 'image', updatedImages[0]);
            }
        } catch (err) {
            setError('Failed to upload variant images.');
        } finally {
            setUploadingVariantIdx(null);
        }
    };

    // Cropper Logic
    const handleCropOpen = (index: 'cover' | number, src?: string) => {
        setCropImageIndex(index);
        setCropImageSrc(src || (index === 'cover' ? newCoverPreview || undefined : newPreviews[index]));
        setCrop(null); // clear crop so onImageLoad can calculate the max center area
        setCompletedCrop(null);
        setCropModalOpen(true);
    };

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const initialCrop = centerCrop(
            makeAspectCrop(
                { unit: '%', width: 100 },
                1,
                width,
                height
            ),
            width,
            height
        );
        setCrop(initialCrop);
    };

    const handleCropSave = () => {
        if (!completedCrop || !imageRef.current || cropImageIndex === null) {
            setCropModalOpen(false);
            return;
        }
        const canvas = document.createElement('canvas');
        const image = imageRef.current;
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = completedCrop.width * scaleX;
        canvas.height = completedCrop.height * scaleY;

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY
        );

        canvas.toBlob((blob) => {
            if (!blob) {
                setCropModalOpen(false);
                return;
            }
            if (cropImageIndex === 'cover') {
                const fileName = newCoverFile?.name || 'cover.jpg';
                const croppedFile = new File([blob], fileName, { type: blob.type });
                const previewUrl = URL.createObjectURL(croppedFile);
                setNewCoverFile(croppedFile);
                setNewCoverPreview(previewUrl);
            } else if (typeof cropImageIndex === 'number') {
                const fileName = newFiles[cropImageIndex]?.name || `image-${cropImageIndex}.jpg`;
                const croppedFile = new File([blob], fileName, { type: blob.type });
                const previewUrl = URL.createObjectURL(croppedFile);

                setNewFiles(prev => prev.map((f, i) => i === cropImageIndex ? croppedFile : f));
                setNewPreviews(prev => prev.map((u, i) => i === cropImageIndex ? previewUrl : u));
            }
            setCropModalOpen(false);
        }, cropImageIndex === 'cover' ? (newCoverFile?.type || 'image/jpeg') : (newFiles[typeof cropImageIndex === 'number' ? cropImageIndex : 0]?.type || 'image/jpeg'));
    };

    // Close modal on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setCropModalOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name.trim()) return showToast('Product name is required.', 'error', 'Validation Error');
        if (!description.trim()) return showToast('Description is required.', 'error', 'Validation Error');
        if (!category) return showToast('Please select a category.', 'error', 'Validation Error');

        if (!sku || !sku.trim()) return showToast('SKU is required.', 'error', 'Validation Error');
        if (countInStock === undefined || countInStock === null || countInStock === '') return showToast('Stock is required.', 'error', 'Validation Error');
        if (!currency || !currency.trim()) return showToast('Currency is required.', 'error', 'Validation Error');

        if (salesType === 'specific' && selectedCountries.length === 0) {
            return showToast('At least one country must be selected for specific Sales Region.', 'error', 'Validation Error');
        }

        if (!price || isNaN(Number(price)) || Number(price) <= 0) {
            return showToast('Please enter a valid base price (MRP) greater than 0.', 'error', 'Validation Error');
        }
        if (salePrice && (isNaN(Number(salePrice)) || Number(salePrice) < 0)) {
            return showToast('Sale price must be a valid non-negative number.', 'error', 'Validation Error');
        }
        if (salePrice && Number(salePrice) >= Number(price)) {
            return showToast('Sale price must be lower than the base price.', 'error', 'Validation Error');
        }
        if (rating !== undefined && rating !== '' && (isNaN(Number(rating)) || Number(rating) < 0 || Number(rating) > 5)) {
            return showToast('Rating must be between 0 and 5.', 'error', 'Validation Error');
        }
        if (numOrders !== undefined && numOrders !== '' && (isNaN(Number(numOrders)) || Number(numOrders) < 0 || !Number.isInteger(Number(numOrders)))) {
            return showToast('Sold count must be a non-negative integer.', 'error', 'Validation Error');
        }

        if (!existingCoverImage && !newCoverFile) return showToast('Cover Image is required.', 'error', 'Validation Error');

        // Validate required custom fields
        for (const cf of customFields) {
            if (cf.isRequired && !customFieldValues[cf.name]?.trim()) {
                return showToast(`"${cf.name}" is a required custom field.`, 'error', 'Validation Error');
            }
        }

        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('name', name.trim());
            fd.append('description', description.trim());
            fd.append('category', category);
            fd.append('sku', sku);
            fd.append('barcode', barcode);
            fd.append('moq', '1'); // Default MOQ to 1 for B2C
            fd.append('currency', currency);
            fd.append('countInStock', String(countInStock));
            fd.append('status', status);
            fd.append('oldPrice', String(oldPrice));
            fd.append('price', String(price));
            fd.append('sale_price', salePrice !== undefined && salePrice !== null && salePrice !== '' ? String(salePrice) : '');
            fd.append('rating', String(rating));
            fd.append('numOrders', String(numOrders));
            fd.append('video', video);
            fd.append('sample_available', 'false');
            fd.append('sample_price', '0');
            fd.append('customization_available', 'false');
            fd.append('customization_options', JSON.stringify([]));

            // Filter out empty variants and attributes to prevent validation errors
            const filteredVariants = variants.filter(v =>
                v.attributes.some(attr => attr.name.trim() !== '' && attr.value.trim() !== '')
            ).map(v => ({
                sku: v.sku?.trim() || '',
                attributes: v.attributes.filter(attr => attr.name.trim() !== '' && attr.value.trim() !== ''),
                price: v.price && v.price !== '' ? Number(v.price) : null,
                stock: v.stock !== undefined && v.stock !== null && String(v.stock) !== '' ? Number(v.stock) : 0,
                image: v.image || '',
                images: v.images || []
            }));

            const filteredAttributes = keyAttributes.filter(a => a.key.trim() !== '' || a.value.trim() !== '');

            // Merge custom field values into key_attributes
            const customFieldAttrs: Attribute[] = customFields
                .filter(cf => customFieldValues[cf.name] !== undefined && customFieldValues[cf.name] !== '')
                .map(cf => ({ key: cf.name, value: String(customFieldValues[cf.name]) }));

            const mergedAttributes = [
                ...filteredAttributes.filter(a => !customFields.some(cf => cf.name === a.key)),
                ...customFieldAttrs,
            ];

            fd.append('variants', JSON.stringify(filteredVariants));
            fd.append('key_attributes', JSON.stringify(mergedAttributes));
            fd.append('features', JSON.stringify(features.filter(f => f.trim() !== '')));
            fd.append('existing_cover_image', existingCoverImage || '');
            if (newCoverFile) {
                fd.append('cover_image', newCoverFile);
            }

            const keepImages = existingImagesMetadata.map(m => m.url);
            fd.append('keep_images', JSON.stringify(keepImages));
            fd.append('images_metadata', JSON.stringify(existingImagesMetadata));
            fd.append('cover_image_alt', coverImageAlt);
            fd.append('new_images_alts', JSON.stringify(newImagesAlts));

            fd.append('sales_type', salesType);
            fd.append('countries', JSON.stringify(selectedCountries));
            newFiles.forEach(f => fd.append('images', f));
            if (threeDModelFile) {
                fd.append('three_d_model', threeDModelFile);
            } else {
                fd.append('three_d_model', existingThreeDModel);
            }

            fd.append('isDigital', String(isDigital));
            if (digitalFile) {
                fd.append('digital_file', digitalFile);
            }

            fd.append('dropshipping_supported', String(dropshippingSupported));
            fd.append('gift_wrap_supported', String(giftWrapSupported));
            fd.append('gift_wrap_fee', giftWrapFee !== '' && giftWrapFee !== null ? String(giftWrapFee) : '');
            fd.append('emi_supported', String(emiSupported));

            if (isEdit && product?._id) {
                await updateProduct(product._id, fd);
                showToast('Product updated successfully!', 'success', 'Success');
            } else {
                await createProduct(fd);
                showToast('Product created successfully!', 'success', 'Success');
            }
            setTimeout(() => onSave(), 1200);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'An error occurred. Please try again.';
            setError(msg);
            showToast(msg, 'error', 'Submission Error');
        } finally {
            setLoading(false);
        }
    };

    const isTabCompleted = (tabKey: string): boolean => {
        if (tabKey === 'general') {
            return !!name.trim() && !!description.trim() && !!category && !!sku.trim();
        }
        if (tabKey === 'pricing') {
            return !!price && !isNaN(Number(price)) && Number(price) > 0 && countInStock !== '';
        }
        if (tabKey === 'specs') {
            return customFields.every(cf => !cf.isRequired || (customFieldValues[cf.name] && customFieldValues[cf.name].trim() !== ''));
        }
        if (tabKey === 'media') {
            return !!existingCoverImage || !!newCoverFile;
        }
        return false;
    };

    return (
        <div className={styles['pm-wrapper']}>
            {cropModalOpen && (
                <div className={styles['pm-crop-modal-overlay']} onClick={() => setCropModalOpen(false)}>
                    <div className={styles['pm-crop-modal']} onClick={e => e.stopPropagation()}>
                        <div className={styles['pm-crop-modal-header']}>
                            <h3>Crop Image</h3>
                            <button type="button" className={styles['pm-modal-close-icon']} onClick={() => setCropModalOpen(false)}>✕</button>
                        </div>
                        <div className={styles['pm-crop-container']}>
                            <ReactCrop
                                crop={crop}
                                onChange={c => setCrop(c)}
                                onComplete={c => setCompletedCrop(c)}
                                aspect={1}
                            >
                                <img
                                    src={cropImageSrc}
                                    ref={imageRef}
                                    onLoad={onImageLoad}
                                    alt="Crop preview"
                                    className={styles['pm-crop-image']}
                                />
                            </ReactCrop>
                        </div>
                        <div className={styles['pm-crop-modal-footer']}>
                            <button type="button" className={styles['pm-btn-secondary']} onClick={() => setCropModalOpen(false)}>Cancel</button>
                            <button type="button" className={styles['pm-btn-primary']} onClick={handleCropSave}>Apply Crop</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ SHOPIFY-STYLE PAGE HEADER ═══ */}
            <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {/* Breadcrumb */}
                <div style={{ padding: '10px 32px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '0' }}>
                        Products
                    </button>
                    <span style={{ color: '#cbd5e1', fontSize: '13px' }}>›</span>
                    <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: 600 }}>{isEdit ? 'Edit Product' : 'New Product'}</span>
                </div>

                {/* Title Row */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '8px 32px 16px' }}>
                    <div>
                        <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
                            {isEdit ? 'Edit Product' : 'Add New Product'}
                        </h1>
                        <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', fontWeight: 500 }}>
                            {isEdit ? 'Update your product information and manage all details.' : 'Fill in the details below to list your product.'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '9px 18px', background: '#ffffff', border: '1.5px solid #e2e8f0',
                                color: '#475569', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                                cursor: 'pointer', transition: 'all 0.18s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                        >
                            ← Back to Products
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '9px 18px', background: 'linear-gradient(135deg, #ff6a00, #ff8c00)',
                                border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: 800,
                                fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,106,0,0.3)'
                            }}
                        >
                            Preview Product
                        </button>
                    </div>
                </div>
            </div>

            <form className={styles['pm-form-wrapper']} onSubmit={handleSubmit}>
                {/* ═══ TWO-COLUMN LAYOUT ═══ */}
                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

                    {/* ══ LEFT SIDEBAR STEP NAVIGATOR ══ */}
                    <div style={{
                        width: '270px', flexShrink: 0,
                        position: 'sticky', top: '16px'
                    }}>
                        <div style={{
                            background: '#ffffff', borderRadius: '16px',
                            border: '1px solid #e2e8f0', padding: '16px 14px',
                            boxShadow: '0 4px 20px rgba(15,23,42,0.04)'
                        }}>
                            {/* Step Progress Header */}
                            <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                        Step {(['general','pricing','specs','media'] as const).indexOf(activeFormTab as any) + 1} of 4
                                    </span>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#ea580c' }}>
                                        {((['general','pricing','specs','media'] as const).indexOf(activeFormTab as any) + 1) * 25}%
                                    </span>
                                </div>
                                <div style={{ height: '5px', width: '100%', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${((['general','pricing','specs','media'] as const).indexOf(activeFormTab as any) + 1) * 25}%`,
                                        background: 'linear-gradient(90deg, #ff6a00, #ff8c00)',
                                        borderRadius: '10px',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>

                            {/* Vertical Timeline Steps */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {([
                                    { key: 'general',  label: 'Basic Details',       desc: 'Name, description, brand, SKU', num: 1 },
                                    { key: 'pricing',  label: 'Pricing & Variants',  desc: 'Price, stock, variants',        num: 2 },
                                    { key: 'specs',    label: 'Category & Specs',    desc: 'Category, attributes, specs',   num: 3 },
                                    { key: 'media',    label: 'Media & Capabilities',desc: 'Images, videos, documents',     num: 4 }
                                ] as const).map(step => {
                                    const isActive = activeFormTab === step.key;
                                    const isDone   = isTabCompleted(step.key);
                                    return (
                                        <button
                                            key={step.key}
                                            type="button"
                                            onClick={() => setActiveFormTab(step.key as any)}
                                            style={{
                                                display: 'flex', alignItems: 'flex-start', gap: '12px',
                                                width: '100%', padding: '10px 12px',
                                                borderRadius: '10px', border: 'none', cursor: 'pointer',
                                                background: isActive ? '#fff7ed' : 'transparent',
                                                borderLeft: isActive ? '3px solid #ea580c' : '3px solid transparent',
                                                textAlign: 'left', transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={e => {
                                                if (!isActive) e.currentTarget.style.background = '#f8fafc';
                                            }}
                                            onMouseLeave={e => {
                                                if (!isActive) e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <span style={{
                                                width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '11.5px', fontWeight: 800, marginTop: '1px',
                                                background: isActive ? '#ea580c' : (isDone ? '#dcfce7' : '#f1f5f9'),
                                                color: isActive ? '#ffffff' : (isDone ? '#15803d' : '#64748b'),
                                                transition: 'all 0.2s ease'
                                            }}>
                                                {isDone && !isActive ? '✓' : step.num}
                                            </span>
                                            <span style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{
                                                    display: 'block', fontSize: '13px', fontWeight: isActive ? 800 : 700,
                                                    color: isActive ? '#c2410c' : (isDone ? '#15803d' : '#334155'),
                                                    lineHeight: '1.3'
                                                }}>{step.label}</span>
                                                <span style={{
                                                    display: 'block', fontSize: '11px', fontWeight: 500, marginTop: '2px',
                                                    color: isActive ? '#ea580c' : '#94a3b8',
                                                    lineHeight: '1.3'
                                                }}>{step.desc}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ══ RIGHT CONTENT PANEL ══ */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                        {/* Section header (shown above tab content) */}
                        <div style={{
                            marginBottom: '20px'
                        }}>
                            <div>
                                <h2 style={{ margin: '0 0 3px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                                    {activeFormTab === 'general'  ? 'Basic Details'         :
                                     activeFormTab === 'pricing'  ? 'Pricing & Variants'    :
                                     activeFormTab === 'specs'    ? 'Category & Specs'      :
                                                                    'Media & Capabilities'}
                                </h2>
                                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                                    {activeFormTab === 'general'  ? 'Provide the fundamental information about your product.'   :
                                     activeFormTab === 'pricing'  ? 'Set pricing, stock levels and product variants.'           :
                                     activeFormTab === 'specs'    ? 'Define category, attributes and custom specifications.'    :
                                                                    'Upload images, videos and configure product capabilities.'}
                                </p>
                            </div>
                        </div>

                    {/* Tab 1: General Info */}
                    {activeFormTab === 'general' && (
                        <>
                            {/* Section 1: Basic Info */}
                            <div className={styles['pm-form-card']}>
                                <div className={styles['pm-form-card-header']}>Basic Information</div>
                                <div className={styles['pm-form-card-body']}>
                                    <div className={styles['pm-form-row'] + " " + styles['single']}>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Product Name <span>*</span></label>
                                            <input className={styles['pm-form-input']} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Industrial Safety Helmet" />
                                        </div>
                                    </div>
                                    <div className={styles['pm-form-row']}>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Category <span>*</span></label>
                                            <select className={styles['pm-form-select']} value={parentCategory} onChange={e => handleParentChange(e.target.value)}>
                                                <option value="">-- Select Category --</option>
                                                {categories.map(c => (
                                                    <option key={c._id} value={c._id}>{c.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Sub Category</label>
                                            <select className={styles['pm-form-select']} value={category !== parentCategory ? category : ''} onChange={e => handleSubChange(e.target.value)} disabled={subCategories.length === 0}>
                                                <option value="">-- Select Sub Category --</option>
                                                {subCategories.map(c => (
                                                    <option key={c._id} value={c._id}>{c.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className={styles['pm-form-row'] + " " + styles['single']}>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Description <span>*</span></label>
                                            <textarea className={styles['pm-form-textarea']} value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed product description..." rows={5} />
                                        </div>
                                    </div>
                                    <div className={styles['pm-form-row']}>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>SKU <span>*</span></label>
                                            <input className={styles['pm-form-input']} value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. HLM-RED-XL" />
                                        </div>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Stock (Inventory) <span>*</span></label>
                                            <input className={styles['pm-form-input']} type="number" min="-1" value={countInStock} onChange={e => setCountInStock(e.target.value)} />
                                            <span className={styles['helper-text']} style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Enter -1 for unlimited stock</span>
                                        </div>
                                    </div>
                                    <div className={styles['pm-form-row']}>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Barcode (UPC / EAN / GTIN)</label>
                                            <input className={styles['pm-form-input']} value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="e.g. 190199123456" />
                                        </div>
                                    </div>
                                    <div className={styles['pm-form-row'] + " " + styles['three-col']}>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Currency</label>
                                            <select className={styles['pm-form-select']} value={currency} onChange={e => setCurrency(e.target.value)}>
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                                <option value="GBP">GBP (£)</option>
                                                <option value="INR">INR (₹)</option>
                                                <option value="CNY">CNY (¥)</option>
                                            </select>
                                        </div>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Status</label>
                                            <select className={styles['pm-form-select']} value={status} onChange={e => setStatus(e.target.value)}>
                                                <option value="draft">Draft</option>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Sales Region Selection */}
                                    <div className={styles['pm-form-row']} style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                        <div className={styles['pm-form-group'] + " " + styles['w-100']}>
                                            <label className={styles['pm-form-label']} style={{ fontWeight: 800 }}>Sales Region (Where to sell?) <span>*</span></label>
                                            <div className={styles['pm-segmented-control-wrapper']}>
                                                <div
                                                    className={`${styles['pm-segmented-option']} ${salesType === 'worldwide' ? styles['active'] : ''}`}
                                                    onClick={() => setSalesType('worldwide')}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                                                    Worldwide
                                                </div>
                                                <div
                                                    className={`${styles['pm-segmented-option']} ${salesType === 'specific' ? styles['active'] : ''}`}
                                                    onClick={() => setSalesType('specific')}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                                    Specific Countries
                                                </div>
                                            </div>
                                            {salesType === 'specific' && (
                                                <div className={styles['country-selector-box']} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#f8fafc' }}>
                                                    <div className={styles['country-search-wrapper']} style={{ position: 'relative', marginBottom: '16px' }}>
                                                        <input
                                                            className={styles['pm-form-input']}
                                                            placeholder="Search countries..."
                                                            value={countrySearchTerm}
                                                            onChange={e => setCountrySearchTerm(e.target.value)}
                                                            onFocus={() => setShowCountryOptions(true)}
                                                            onClick={() => setShowCountryOptions(true)}
                                                        />
                                                        {showCountryOptions && (
                                                            <div className={styles['country-options-dropdown']} style={{
                                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                                maxHeight: '320px', overflowY: 'auto', background: '#fff',
                                                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: '8px',
                                                                zIndex: 1000, marginTop: '5px', border: '1px solid #e2e8f0'
                                                            }}>
                                                                <div
                                                                    style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontWeight: 900, color: '#1a1a2e', background: '#f8fafc' }}
                                                                    onClick={() => {
                                                                        setSelectedCountries(allCountries.map(c => c.code));
                                                                        setShowCountryOptions(false);
                                                                    }}
                                                                >
                                                                    Select All Countries
                                                                </div>
                                                                {allCountries
                                                                    .filter(c => c.name.toLowerCase().includes(countrySearchTerm.toLowerCase()))
                                                                    .map(country => (
                                                                        <div
                                                                            key={country.code}
                                                                            style={{
                                                                                padding: '10px 12px', cursor: 'pointer',
                                                                                display: 'flex', justifyContent: 'space-between',
                                                                                background: selectedCountries.includes(country.code) ? '#f0f9ff' : 'transparent',
                                                                                borderBottom: '1px solid #f1f5f9'
                                                                            }}
                                                                            onClick={() => {
                                                                                if (selectedCountries.includes(country.code)) {
                                                                                    setSelectedCountries(prev => prev.filter(c => c !== country.code));
                                                                                } else {
                                                                                    setSelectedCountries(prev => [...prev, country.code]);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <span style={{ fontSize: '14px' }}>{country.name} ({country.code})</span>
                                                                            {selectedCountries.includes(country.code) && <span style={{ color: '#1a1a2e', fontWeight: 900 }}>✓</span>}
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Selected countries table */}
                                                    <div className={styles['selected-countries-container']} style={{ marginTop: '4px' }}>
                                                        {selectedCountries.length > 0 ? (
                                                            <div className={styles['table-responsive']} style={{ borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', background: '#fff' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                                        <tr>
                                                                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Country</th>
                                                                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>ISOCode</th>
                                                                            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Action</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {selectedCountries.map(code => {
                                                                            const country = allCountries.find(c => c.code === code);
                                                                            return (
                                                                                <tr key={code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                                    <td style={{ padding: '10px 12px', fontWeight: 800, color: '#1a1a2e' }}>
                                                                                        {country?.name || code}
                                                                                    </td>
                                                                                    <td style={{ padding: '10px 12px', color: '#64748b', fontFamily: 'monospace' }}>{code}</td>
                                                                                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setSelectedCountries(prev => prev.filter(c => c !== code))}
                                                                                            style={{ background: '#fff1f2', color: '#be123c', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                                                                        >
                                                                                            Remove
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div style={{ padding: '12px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                                                <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No countries selected. Please search and select above.</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Tab 2: Pricing & Variants */}
                    {activeFormTab === 'pricing' && (
                        <>
                            {/* Section 2: Pricing & Discount */}
                            <div className={styles['pm-form-card']}>
                                <div className={styles['pm-form-card-header']}>Pricing & Discount <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.8 }}>— B2C Retail Pricing</span></div>
                                <div className={styles['pm-form-card-body']}>
                                    <div className={styles['pm-form-row']}>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Base Price (MRP) <span style={{ color: '#e11d48' }}>*</span></label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    className={styles['pm-form-input']}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={price}
                                                    onChange={e => handlePriceChange(e.target.value)}
                                                    style={{ paddingRight: '45px' }}
                                                />
                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700, fontSize: '13px' }}>{currency}</span>
                                            </div>
                                        </div>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Sale Price (Retail Promo)</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    className={styles['pm-form-input']}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="Optional promotion price"
                                                    value={salePrice}
                                                    onChange={e => handleSalePriceChange(e.target.value)}
                                                    style={{ paddingRight: '45px' }}
                                                />
                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700, fontSize: '13px' }}>{currency}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles['pm-form-row']} style={{ marginTop: '16px' }}>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Original Price (Old Price - Strikethrough)</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    className={styles['pm-form-input']}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="Original price for strikethrough"
                                                    value={oldPrice}
                                                    onChange={e => handleOldPriceChange(e.target.value)}
                                                    style={{ paddingRight: '45px' }}
                                                />
                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700, fontSize: '13px' }}>{currency}</span>
                                            </div>
                                        </div>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Currency</label>
                                            <select
                                                className={styles['pm-form-select']}
                                                value={currency}
                                                onChange={e => setCurrency(e.target.value)}
                                            >
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                                <option value="GBP">GBP (£)</option>
                                                <option value="INR">INR (₹)</option>
                                                <option value="CNY">CNY (¥)</option>
                                            </select>
                                        </div>
                                    </div>
                                    {discountPercentage > 0 && (
                                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className={styles['pm-badge-green']} style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                                                {discountPercentage}% OFF Discount Applied
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Variants */}
                            <div className={styles['pm-form-card']}>
                                <div className={styles['pm-form-card-header']}>Product Variants <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.8 }}>— Configurable B2C variant combinations</span></div>
                                <div className={styles['pm-form-card-body']}>

                                    <div className={styles['pm-variants-container']}>
                                        {variants.map((v, i) => (
                                            <div key={i} className={styles['pm-variant-card-item']} style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px', background: '#fff' }}>
                                                <div className={styles['pm-variant-card-header-inner']} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px' }}>
                                                    <div className={styles['pm-variant-badge']} style={{ background: 'var(--primary-color)', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>Combination #{i + 1}</div>
                                                    <button type="button" className={styles['pm-variant-remove-icon']} onClick={() => removeVariant(i)} style={{ border: 'none', background: '#fef2f2', color: '#be123c', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 900 }}>✕</button>
                                                </div>
                                                <div className={styles['pm-variant-card-grid']} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div className={styles['pm-variant-field']}>
                                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>SKU Override</label>
                                                        <input type="text" className={styles['pm-form-input']} placeholder="e.g. HLM-RED-M" value={v.sku || ''} onChange={e => updateVariant(i, 'sku', e.target.value)} />
                                                    </div>
                                                    <div className={styles['pm-variant-field']}>
                                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>Price Override ({currency})</label>
                                                        <input type="number" step="0.01" className={styles['pm-form-input']} placeholder="Leave blank to use base price" value={v.price ?? ''} onChange={e => updateVariant(i, 'price', e.target.value)} />
                                                    </div>
                                                    <div className={styles['pm-variant-field']}>
                                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>Variant Stock</label>
                                                        <input type="number" className={styles['pm-form-input']} placeholder="0" value={v.stock} onChange={e => updateVariant(i, 'stock', e.target.value)} />
                                                    </div>
                                                    <div className={styles['pm-variant-field']} style={{ gridColumn: 'span 2' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>Variant Image Gallery (Drag to reorder)</label>

                                                            {/* Copy From dropdown */}
                                                            {variants.length > 1 && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>Copy from:</span>
                                                                    <select
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            if (val !== '') {
                                                                                copyVariantImages(i, Number(val));
                                                                                e.target.value = ''; // Reset select
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            fontSize: '11px',
                                                                            padding: '2px 4px',
                                                                            borderRadius: '4px',
                                                                            border: '1px solid #cbd5e1',
                                                                            background: '#fff'
                                                                        }}
                                                                        defaultValue=""
                                                                    >
                                                                        <option value="" disabled>Select combo...</option>
                                                                        {variants.map((vOpt, optIdx) => {
                                                                            if (optIdx === i) return null;
                                                                            const attrsStr = vOpt.attributes
                                                                                .filter(a => a.name && a.value)
                                                                                .map(a => `${a.name}: ${a.value}`)
                                                                                .join(', ') || `Combo #${optIdx + 1}`;
                                                                            return (
                                                                                <option key={optIdx} value={optIdx}>
                                                                                    Combination #{optIdx + 1} ({attrsStr})
                                                                                </option>
                                                                            );
                                                                        })}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                                            {/* Upload button inside gallery */}
                                                            <label className={styles['pm-variant-upload-btn']} style={{ display: 'flex', flexDirection: 'column', width: '60px', height: '60px', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', gap: '2px', transition: 'all 0.2s' }}>
                                                                <input type="file" accept="image/*" multiple hidden onChange={e => e.target.files && handleVariantMultipleImagesUpload(i, e.target.files)} />
                                                                {uploadingVariantIdx === i ? (
                                                                    <div className={styles['pm-spinner-small']}></div>
                                                                ) : (
                                                                    <>
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                                                        <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b' }}>UPLOAD</span>
                                                                    </>
                                                                )}
                                                            </label>

                                                            {/* Image previews */}
                                                            {(v.images || []).map((imgUrl, imgIdx) => {
                                                                const isPrimary = v.image === imgUrl;
                                                                return (
                                                                    <div
                                                                        key={imgIdx}
                                                                        draggable
                                                                        onDragStart={() => handleVarDragStart(i, imgIdx)}
                                                                        onDragOver={(e) => e.preventDefault()}
                                                                        onDrop={() => handleVarDrop(i, imgIdx)}
                                                                        style={{
                                                                            position: 'relative',
                                                                            width: '60px',
                                                                            height: '60px',
                                                                            borderRadius: '8px',
                                                                            border: isPrimary ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                                                                            overflow: 'hidden',
                                                                            background: '#fff',
                                                                            cursor: 'grab',
                                                                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                                                        }}
                                                                        title={isPrimary ? "Primary Variant Image (First in gallery)" : "Click to set primary, drag to reorder"}
                                                                        onClick={() => setPrimaryVariantImage(i, imgIdx)}
                                                                    >
                                                                        <img src={getImgUrl(imgUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); removeVariantImage(i, imgIdx); }}
                                                                            style={{
                                                                                position: 'absolute',
                                                                                top: '1px',
                                                                                right: '1px',
                                                                                background: 'rgba(239, 68, 68, 0.9)',
                                                                                color: '#fff',
                                                                                border: 'none',
                                                                                borderRadius: '50%',
                                                                                width: '14px',
                                                                                height: '14px',
                                                                                fontSize: '8px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                        {isPrimary && (
                                                                            <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'var(--primary-color)', color: '#fff', fontSize: '7px', fontWeight: '800', textAlign: 'center', padding: '1px 0', textTransform: 'uppercase' }}>
                                                                                Cover
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Nested Attributes List */}
                                                <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>Attributes (e.g., Color: Red)</span>
                                                        <button type="button" onClick={() => addVariantAttribute(i)} style={{ border: 'none', background: 'none', color: 'var(--primary-color)', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>+ Add Attribute Pair</button>
                                                    </div>
                                                    {v.attributes.map((attr, attrIdx) => (
                                                        <div key={attrIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                                                            <input type="text" className={styles['pm-form-input']} style={{ height: '36px', fontSize: '13px' }} placeholder="Name (e.g. Color)" value={attr.name} onChange={e => updateVariantAttribute(i, attrIdx, 'name', e.target.value)} />
                                                            <input type="text" className={styles['pm-form-input']} style={{ height: '36px', fontSize: '13px' }} placeholder="Value (e.g. Red)" value={attr.value} onChange={e => updateVariantAttribute(i, attrIdx, 'value', e.target.value)} />
                                                            {v.attributes.length > 1 && (
                                                                <button type="button" onClick={() => removeVariantAttribute(i, attrIdx)} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button type="button" className={styles['pm-add-variant-btn-modern']} onClick={() => setVariants(prev => [...prev, emptyVariant()])} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '2px dashed var(--primary-color)', color: 'var(--primary-color)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, margin: '10px auto' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                        Add New Variant Combination
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Tab 3: Specifications */}
                    {activeFormTab === 'specs' && (
                        <>
                            {/* Section 4: Category Specifications (Dynamic Custom Fields) */}
                            {customFields.length > 0 && (
                                <div className={styles['pm-form-card']}>
                                    <div className={styles['pm-form-card-header']}>
                                        Category Specifications
                                        <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.8 }}> — Dynamic fields for this category</span>
                                    </div>
                                    <div className={styles['pm-form-card-body']}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                            {customFields.map(cf => (
                                                <div key={cf._id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {cf.icon && <img src={cf.icon.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || ''}${cf.icon}` : cf.icon} alt="" style={{ width: '16px', height: '16px', objectFit: 'cover', borderRadius: '3px' }} />}
                                                        {cf.name}
                                                        {cf.isRequired && <span style={{ color: '#e11d48', fontWeight: 900 }}>*</span>}
                                                    </label>
                                                    {cf.type === 'select' ? (
                                                        <select
                                                            className={styles['pm-form-input']}
                                                            value={customFieldValues[cf.name] || ''}
                                                            onChange={e => setCustomFieldValues(prev => ({ ...prev, [cf.name]: e.target.value }))}
                                                        >
                                                            <option value="">Select {cf.name}...</option>
                                                            {cf.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    ) : cf.type === 'textarea' ? (
                                                        <textarea
                                                            className={styles['pm-form-input']}
                                                            value={customFieldValues[cf.name] || ''}
                                                            onChange={e => setCustomFieldValues(prev => ({ ...prev, [cf.name]: e.target.value }))}
                                                            placeholder={`Enter ${cf.name}${cf.minLength ? ` (min ${cf.minLength})` : ''}${cf.maxLength ? ` (max ${cf.maxLength})` : ''}`}
                                                            minLength={cf.minLength || undefined}
                                                            maxLength={cf.maxLength || undefined}
                                                            style={{ minHeight: '80px', resize: 'vertical' }}
                                                        />
                                                    ) : (
                                                        <input
                                                            type={cf.type === 'number' ? 'number' : 'text'}
                                                            className={styles['pm-form-input']}
                                                            value={customFieldValues[cf.name] || ''}
                                                            onChange={e => setCustomFieldValues(prev => ({ ...prev, [cf.name]: e.target.value }))}
                                                            placeholder={`Enter ${cf.name}${cf.minLength ? ` (min: ${cf.minLength})` : ''}${cf.maxLength ? ` (max: ${cf.maxLength})` : ''}`}
                                                            min={cf.type === 'number' && cf.minLength != null ? cf.minLength : undefined}
                                                            max={cf.type === 'number' && cf.maxLength != null ? cf.maxLength : undefined}
                                                            minLength={cf.type !== 'number' && cf.minLength != null ? cf.minLength : undefined}
                                                            maxLength={cf.type !== 'number' && cf.maxLength != null ? cf.maxLength : undefined}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section 4b: Key Attributes */}
                            <div className={styles['pm-form-card']}>
                                <div className={styles['pm-form-card-header']}>Key Attributes <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.8 }}>— Product specs (e.g., Material, Warranty, Weight)</span></div>
                                <div className={styles['pm-form-card-body']}>
                                    {keyAttributes.length > 0 && (
                                        <div className={styles['pm-variant-header']} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '12px' }}>
                                            <div className={styles['pm-form-label']} style={{ marginBottom: 0 }}>Attribute Name</div>
                                            <div className={styles['pm-form-label']} style={{ marginBottom: 0 }}>Value</div>
                                            <div></div>
                                        </div>
                                    )}
                                    {keyAttributes.map((attr, i) => (
                                        <div key={i} className={styles['pm-variant-row'] + ' ' + styles['pm-attr-row']}>
                                            <input className={styles['pm-form-input']} placeholder="Attr Name (e.g. Warranty)" value={attr.key} onChange={e => updateAttribute(i, 'key', e.target.value)} />
                                            <input className={styles['pm-form-input']} placeholder="Value (e.g. 1 Year)" value={attr.value} onChange={e => updateAttribute(i, 'value', e.target.value)} />
                                            <button type="button" className={styles['pm-remove-btn']} onClick={() => removeAttribute(i)}>✕</button>
                                        </div>
                                    ))}
                                    <button type="button" className={styles['pm-add-row-btn']} onClick={() => setKeyAttributes(prev => [...prev, emptyAttribute()])}>
                                        + Add Attribute
                                    </button>
                                </div>
                            </div>

                            {/* Section 4c: Key Product Features */}
                            <div className={styles['pm-form-card']}>
                                <div className={styles['pm-form-card-header']}>
                                    Key Product Features
                                    <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.8 }}> — Bullet highlights shown on detail pages</span>
                                </div>
                                <div className={styles['pm-form-card-body']}>
                                    {features.map((feat, i) => (
                                        <div key={i} className={styles['pm-variant-row'] + ' ' + styles['pm-attr-row']} style={{ gridTemplateColumns: '1fr auto', gap: '12px' }}>
                                            <input
                                                className={styles['pm-form-input']}
                                                placeholder="e.g. Waterproof up to 50m / 24 Hours battery life"
                                                value={feat}
                                                onChange={e => updateFeature(i, e.target.value)}
                                            />
                                            <button type="button" className={styles['pm-remove-btn']} onClick={() => removeFeature(i)}>✕</button>
                                        </div>
                                    ))}
                                    <button type="button" className={styles['pm-add-row-btn']} onClick={addFeature}>
                                        + Add Feature Bullet
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Tab 4: Media & Uploads */}
                    {activeFormTab === 'media' && (
                        <>
                            {/* Section 5: Images */}
                            <div className={styles['pm-form-card']}>
                                <div className={styles['pm-form-card-header']}>Product Images <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.8 }}>— Main Cover & Additional angles</span></div>
                                <div className={styles['pm-form-card-body']}>

                                    {/* 1. Cover Image Upload */}
                                    <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
                                        <div className={styles['pm-form-label']} style={{ marginBottom: '8px', color: '#1a1a2e', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 900 }}>
                                            Product Cover Image <span style={{ color: '#e11d48' }}>*</span>
                                        </div>
                                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>This will be the primary thumbnail shown in search results and grids. Automatic crop required.</p>

                                        {existingCoverImage && !newCoverPreview ? (
                                            <div className={styles['pm-image-preview-item']} style={{ position: 'relative', width: '160px', height: '160px', border: '2px solid #e2e8f0' }}>
                                                <img src={getImgUrl(existingCoverImage)} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button type="button" className={styles['pm-image-remove']} onClick={removeExistingCover}>✕</button>
                                            </div>
                                        ) : newCoverPreview ? (
                                            <div className={styles['pm-image-preview-item']} style={{ position: 'relative', width: '160px', height: '160px', border: '2px solid var(--primary-color)' }}>
                                                <img src={newCoverPreview} alt="cover-preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button type="button" className={styles['pm-image-remove']} onClick={removeNewCover}>✕</button>
                                                <button type="button" className={styles['pm-crop-trigger-btn']} onClick={(e) => { e.stopPropagation(); handleCropOpen('cover'); }}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" /><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" /></svg>
                                                    Crop
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className={`${styles['pm-upload-button-div']} ${dragOverCover ? styles['drag-over'] : ''}`}
                                                onClick={() => coverFileInputRef.current?.click()}
                                                onDragOver={e => { e.preventDefault(); setDragOverCover(true); }}
                                                onDragLeave={() => setDragOverCover(false)}
                                                onDrop={e => { e.preventDefault(); setDragOverCover(false); handleCoverSelect(e.dataTransfer.files); }}
                                            >
                                                <div className={styles['pm-upload-icon-wrapper']}>
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                                    </svg>
                                                </div>
                                                <span>Select Cover Image</span>
                                                <input
                                                    ref={coverFileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={e => handleCoverSelect(e.target.files)}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* 1.5. Cover Image Alt Text */}
                                    <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
                                        <div className={styles['pm-form-label']} style={{ marginBottom: '8px', color: '#1a1a2e', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 900 }}>
                                            Cover Image Alt Text (SEO)
                                        </div>
                                        <input
                                            type="text"
                                            className={styles['pm-form-input']}
                                            placeholder="e.g. Red cotton crewneck t-shirt front view"
                                            value={coverImageAlt}
                                            onChange={(e) => setCoverImageAlt(e.target.value)}
                                            style={{ maxWidth: '400px' }}
                                        />
                                    </div>

                                    {/* 2. Additional Images */}
                                    <div className={styles['pm-form-label']} style={{ marginBottom: '12px', color: '#1a1a2e', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 900 }}>
                                        Additional Angles & Detail Shots <span style={{ fontWeight: 400, opacity: 0.8, textTransform: 'none', letterSpacing: 'normal' }}>(Optional, up to {maxImages - 1} more)</span>
                                    </div>

                                    {/* Bulk Action Bar */}
                                    {(selectedExistingIndices.length > 0 || selectedNewIndices.length > 0) && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>
                                                Selected {selectedExistingIndices.length + selectedNewIndices.length} image(s)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={deleteSelectedImages}
                                                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '800' }}
                                            >
                                                Delete Selected
                                            </button>
                                        </div>
                                    )}

                                    <div className={styles['pm-image-previews']} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                        {/* Existing images */}
                                        {existingImagesMetadata.map((meta, i) => {
                                            const isSelected = selectedExistingIndices.includes(i);
                                            return (
                                                <div
                                                    key={`existing-${i}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, i, false)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => handleDrop(e, i, false)}
                                                    className={styles['pm-image-preview-item']}
                                                    style={{
                                                        position: 'relative',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        width: '160px',
                                                        background: '#f8fafc',
                                                        borderRadius: '8px',
                                                        border: '1px solid #cbd5e1',
                                                        padding: '8px',
                                                        cursor: 'grab'
                                                    }}
                                                >
                                                    <div style={{ position: 'relative', width: '144px', height: '144px', borderRadius: '6px', overflow: 'hidden' }}>
                                                        <img src={getImgUrl(meta.url)} alt={`product-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                                                        {/* Select Checkbox */}
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectExisting(i)}
                                                            style={{ position: 'absolute', top: '8px', left: '8px', width: '18px', height: '18px', cursor: 'pointer', zIndex: 10 }}
                                                        />

                                                        <button type="button" className={styles['pm-image-remove']} onClick={() => removeExisting(i)}>✕</button>

                                                        <button type="button" className={styles['pm-crop-trigger-btn']} onClick={(e) => { e.stopPropagation(); handleCropOpen(i, getImgUrl(meta.url)); }}>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" /><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" /></svg>
                                                            Crop
                                                        </button>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        placeholder="Alt text (SEO)"
                                                        value={meta.alt}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setExistingImagesMetadata(prev => prev.map((m, idx) => idx === i ? { ...m, alt: val } : m));
                                                        }}
                                                        style={{
                                                            fontSize: '11px',
                                                            padding: '4px 6px',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '4px',
                                                            width: '100%',
                                                            boxSizing: 'border-box',
                                                            marginTop: '8px'
                                                        }}
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() => setPrimaryExisting(i)}
                                                        style={{
                                                            marginTop: '6px',
                                                            background: '#fff',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            padding: '2px 0',
                                                            cursor: 'pointer',
                                                            fontWeight: '800',
                                                            color: '#475569'
                                                        }}
                                                    >
                                                        ⭐ Set Primary
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* New file previews */}
                                        {newPreviews.map((src, i) => {
                                            const isSelected = selectedNewIndices.includes(i);
                                            return (
                                                <div
                                                    key={`new-${i}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, i, true)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => handleDrop(e, i, true)}
                                                    className={styles['pm-image-preview-item']}
                                                    style={{
                                                        position: 'relative',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        width: '160px',
                                                        background: '#fffbeb',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--primary-color)',
                                                        padding: '8px',
                                                        cursor: 'grab'
                                                    }}
                                                >
                                                    <div style={{ position: 'relative', width: '144px', height: '144px', borderRadius: '6px', overflow: 'hidden' }}>
                                                        <img src={src} alt={`new-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                                                        {/* Select Checkbox */}
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectNew(i)}
                                                            style={{ position: 'absolute', top: '8px', left: '8px', width: '18px', height: '18px', cursor: 'pointer', zIndex: 10 }}
                                                        />

                                                        <button type="button" className={styles['pm-image-remove']} onClick={() => removeNew(i)}>✕</button>

                                                        <button type="button" className={styles['pm-crop-trigger-btn']} onClick={(e) => { e.stopPropagation(); handleCropOpen(i); }}>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" /><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" /></svg>
                                                            Crop
                                                        </button>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        placeholder="Alt text (SEO)"
                                                        value={newImagesAlts[i] || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setNewImagesAlts(prev => prev.map((alt, idx) => idx === i ? val : alt));
                                                        }}
                                                        style={{
                                                            fontSize: '11px',
                                                            padding: '4px 6px',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '4px',
                                                            width: '100%',
                                                            boxSizing: 'border-box',
                                                            marginTop: '8px'
                                                        }}
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() => setPrimaryNew(i)}
                                                        style={{
                                                            marginTop: '6px',
                                                            background: '#fff',
                                                            border: '1px solid var(--primary-color)',
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            padding: '2px 0',
                                                            cursor: 'pointer',
                                                            fontWeight: '800',
                                                            color: 'var(--primary-color)'
                                                        }}
                                                    >
                                                        ⭐ Set Primary
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Upload zone */}
                                    {(existingImagesMetadata.length + newFiles.length) < (maxImages - 1) && (
                                        <div
                                            className={`${styles['pm-upload-button-div']} ${dragOver ? styles['drag-over'] : ''}`}
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files); }}
                                        >
                                            <div className={styles['pm-upload-icon-wrapper']}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                                </svg>
                                            </div>
                                            <span>Add additional images</span>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={e => handleFileSelect(e.target.files)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 5.5: 3D Model Media */}
                            <div className={styles['pm-form-card']}>
                                <div className={styles['pm-form-card-header']}>3D Model Media <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.8 }}>— Upload interactive 3D model (.glb, .gltf)</span></div>
                                <div className={styles['pm-form-card-body']}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>Provide a 3D model file to enable interactive 3D customizer/viewer on the product details page. Supported formats: .glb, .gltf (Max size: 50MB).</p>

                                        {threeDModelFile ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>{threeDModelFile.name}</div>
                                                    <div style={{ fontSize: '11px', color: '#15803d' }}>{(threeDModelFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { setThreeDModelFile(null); setThreeDModelFileName(''); }}
                                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : existingThreeDModel ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>Active 3D Model</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>{existingThreeDModel}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setExistingThreeDModel('')}
                                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className={styles['pm-upload-button-div']}
                                                onClick={() => threeDModelInputRef.current?.click()}
                                            >
                                                <div className={styles['pm-upload-icon-wrapper']}>
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                                        <line x1="12" y1="22.08" x2="12" y2="12" />
                                                    </svg>
                                                </div>
                                                <span>Upload .glb or .gltf 3D Model File</span>
                                                <input
                                                    ref={threeDModelInputRef}
                                                    type="file"
                                                    accept=".glb,.gltf"
                                                    style={{ display: 'none' }}
                                                    onChange={e => {
                                                        if (e.target.files && e.target.files.length > 0) {
                                                            const file = e.target.files[0];
                                                            const ext = file.name.split('.').pop()?.toLowerCase();
                                                            if (ext !== 'glb' && ext !== 'gltf') {
                                                                showToast('Only .glb and .gltf files are allowed.', 'error', 'Invalid File Type');
                                                                return;
                                                            }
                                                            if (file.size > 50 * 1024 * 1024) {
                                                                showToast('File size must be less than 50MB.', 'error', 'File Too Large');
                                                                return;
                                                            }
                                                            setThreeDModelFile(file);
                                                            setThreeDModelFileName(file.name);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 6: Video & Sample */}
                            <div className={styles['pm-form-card']}>
                                <div className={styles['pm-form-card-header']}>Video Option</div>
                                <div className={styles['pm-form-card-body']}>
                                    <div className={styles['pm-form-row'] + " " + styles['single']}>
                                        <div className={styles['pm-form-group']}>
                                            <label className={styles['pm-form-label']}>Product Video <span style={{ fontWeight: 400, fontSize: '0.8rem', opacity: 0.7 }}>— URL or Upload</span></label>
                                            <div className={styles['pm-video-row']}>
                                                <input className={styles['pm-form-input']} value={video} onChange={e => setVideo(e.target.value)} placeholder="https://youtube.com/..." />
                                                <label className={`${styles['pm-btn-secondary']} ${styles['pm-video-upload-btn']}`}>
                                                    {videoLoading ? <div className={styles['pm-spinner-small']}></div> : 'Upload Video'}
                                                    <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => e.target.files && handleVideoUpload(e.target.files[0])} />
                                                </label>
                                            </div>
                                            {video && (
                                                <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', maxWidth: '340px' }}>
                                                    {video.includes('youtube.com') || video.includes('youtu.be') ? (
                                                        <iframe
                                                            src={video.replace('watch?v=', 'embed/')}
                                                            title="Product Video Preview"
                                                            frameBorder="0"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                            style={{ width: '100%', height: '180px', borderRadius: '6px', border: 'none' }}
                                                        />
                                                    ) : (
                                                        <video 
                                                            src={getImgUrl(video)} 
                                                            controls 
                                                            style={{ width: '100%', borderRadius: '6px', maxHeight: '180px', objectFit: 'contain' }} 
                                                        />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setVideo('')}
                                                        style={{ display: 'block', marginTop: '8px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                                                    >
                                                        Remove Video
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 7: Digital Download */}
                            <div className={styles['pm-form-card']}>
                                <div className={styles['pm-form-card-header']}>Digital Download Option</div>
                                <div className={styles['pm-form-card-body']}>
                                    <div className={styles['pm-form-row'] + " " + styles['single']}>
                                        <div className={styles['pm-form-group']}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="isDigitalProduct"
                                                    checked={isDigital}
                                                    onChange={e => setIsDigital(e.target.checked)}
                                                    style={{ width: '18px', height: '18px', accentColor: '#ff6600', cursor: 'pointer' }}
                                                />
                                                <label htmlFor="isDigitalProduct" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                                                    This is a Digital/Virtual product (Digital Download)
                                                </label>
                                            </div>
                                            
                                            {isDigital && (
                                                <div style={{ borderLeft: '3px solid #ff6600', paddingLeft: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label className={styles['pm-form-label']} style={{ margin: 0, fontWeight: 700 }}>Upload Secure Digital File</label>
                                                    <input
                                                        type="file"
                                                        onChange={e => e.target.files && setDigitalFile(e.target.files[0])}
                                                        style={{
                                                            padding: '8px 12px',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '8px',
                                                            background: '#f8fafc',
                                                            width: '100%',
                                                            fontSize: '0.875rem'
                                                        }}
                                                    />
                                                    {existingDigitalFile && (
                                                        <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#ea580c', fontWeight: 600 }}>
                                                            Current secure file on server: {existingDigitalFile.split('/').pop()} (Uploading a new file will replace it)
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Section 8: Checkout & Sourcing Capabilities */}
                            <div className={styles['pm-form-card']}>
                                <div className={styles['pm-form-card-header']}>Checkout & Sourcing Capabilities</div>
                                <div className={styles['pm-form-card-body']}>
                                    <div className={styles['pm-form-row']} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div className={styles['pm-form-group']} style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="dropshippingSupportedCheck"
                                                    checked={dropshippingSupported}
                                                    onChange={e => setDropshippingSupported(e.target.checked)}
                                                    style={{ width: '18px', height: '18px', accentColor: '#ff6600', cursor: 'pointer' }}
                                                />
                                                <label htmlFor="dropshippingSupportedCheck" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                                                    Support Blind Dropshipping for this product
                                                </label>
                                            </div>
                                            <p style={{ margin: '2px 0 0 28px', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                                                If enabled, buyers will be able to request blind dropshipping for this product at checkout.
                                            </p>
                                        </div>

                                        <div className={styles['pm-form-group']} style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="giftWrapSupportedCheck"
                                                    checked={giftWrapSupported}
                                                    onChange={e => setGiftWrapSupported(e.target.checked)}
                                                    style={{ width: '18px', height: '18px', accentColor: '#ff6600', cursor: 'pointer' }}
                                                />
                                                <label htmlFor="giftWrapSupportedCheck" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                                                    Support Premium Gift Wrapping for this product
                                                </label>
                                            </div>
                                            <p style={{ margin: '2px 0 0 28px', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                                                If enabled, buyers can purchase premium gift wrap boxes and greeting cards for this item.
                                            </p>

                                            {giftWrapSupported && (
                                                <div style={{ margin: '8px 0 0 28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <label htmlFor="giftWrapFeeInput" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                                                        Custom Gift Wrap Fee ($):
                                                    </label>
                                                    <input
                                                        type="number"
                                                        id="giftWrapFeeInput"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="5.00 (Default)"
                                                        value={giftWrapFee}
                                                        onChange={e => setGiftWrapFee(e.target.value)}
                                                        style={{
                                                            width: '130px',
                                                            padding: '6px 10px',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '6px',
                                                            fontSize: '0.85rem',
                                                            fontWeight: '700'
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                        (Leave blank to use global default $5.00)
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className={styles['pm-form-group']} style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="emiSupportedCheck"
                                                    checked={emiSupported}
                                                    onChange={e => setEmiSupported(e.target.checked)}
                                                    style={{ width: '18px', height: '18px', accentColor: '#ff6600', cursor: 'pointer' }}
                                                />
                                                <label htmlFor="emiSupportedCheck" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                                                    Support EMI / Installment Payment for this product
                                                </label>
                                            </div>
                                            <p style={{ margin: '2px 0 0 28px', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                                                If enabled, buyers can pay for this item in easy monthly installments (if active EMI plans match this amount).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    </div>{/* end right content panel */}

                </div>{/* end two-column layout */}

                {/* ═══ SHOPIFY-STYLE BOTTOM ACTION BAR ═══ */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: '24px', padding: '16px 20px',
                    background: '#ffffff', borderRadius: '12px',
                    border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.06)'
                }}>
                    {/* Left: Cancel */}
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            padding: '9px 18px', background: 'transparent', border: '1.5px solid #e2e8f0',
                            color: '#64748b', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                            cursor: 'pointer', transition: 'all 0.18s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                    >
                        Cancel
                    </button>

                    {/* Right: Prev Step + Next Step + Submit */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* Prev Step — only show if not on first */}
                        {activeFormTab !== 'general' && (
                            <button
                                type="button"
                                onClick={handlePrevTab}
                                style={{
                                    padding: '9px 18px', background: '#f8fafc', border: '1.5px solid #e2e8f0',
                                    color: '#475569', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                                    cursor: 'pointer', transition: 'all 0.18s ease'
                                }}
                            >
                                ← Prev
                            </button>
                        )}

                        {/* Next Step */}
                        {activeFormTab !== 'media' && (
                            <button
                                type="button"
                                onClick={handleNextTab}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '9px 20px', background: '#fff7f0', border: '1.5px solid #fed7aa',
                                    color: '#ff6a00', borderRadius: '8px', fontWeight: 800, fontSize: '13px',
                                    cursor: 'pointer', transition: 'all 0.18s ease'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#fff0e0'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff7f0'; }}
                            >
                                Next Step →
                            </button>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '7px',
                                padding: '10px 24px', border: 'none', borderRadius: '8px',
                                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #ff6a00, #ff8c00)',
                                color: '#ffffff', fontWeight: 800, fontSize: '13.5px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: loading ? 'none' : '0 4px 14px rgba(255,106,0,0.35)',
                                transition: 'all 0.22s ease', letterSpacing: '0.02em'
                            }}
                        >
                            {loading ? (
                                <>
                                    <span style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                                    Saving...
                                </>
                            ) : (
                                <>✓ {isEdit ? 'Update Product' : 'Create Product'}</>
                            )}
                        </button>
                    </div>
                </div>

            </form>
        </div>
    );
};

export default ProductForm;
