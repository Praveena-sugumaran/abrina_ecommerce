const getBaseImageUrl = () => {
    if (process.env.NEXT_PUBLIC_IMAGE_URL) {
        return process.env.NEXT_PUBLIC_IMAGE_URL;
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
    }
    return '';
};

const IMAGE_URL = getBaseImageUrl();

export const getImgUrl = (img: any, placeholder = 'https://placehold.co/300') => {
    if (!img) return placeholder;
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    // Replace backslashes with forward slashes for cross-platform compatibility
    let normalizedImg = img.replace(/\\/g, '/');

    // Remove /api prefix from the image path if it exists
    if (normalizedImg.startsWith('/api/')) {
        normalizedImg = normalizedImg.replace('/api/', '/');
    }

    return `${IMAGE_URL}${normalizedImg.startsWith('/') ? '' : '/'}${normalizedImg}`;
};

export const getFlagUrl = (code: string) => {
    if (!code) return 'https://flagcdn.com/w80/un.png';
    return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
};

