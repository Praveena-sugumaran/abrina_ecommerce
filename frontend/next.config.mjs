import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {    
    turbopack: {
        root: __dirname,
    },
    distDir: 'build',
    reactStrictMode: true,

    typescript: { ignoreBuildErrors: true },

    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },

    // Optimize compilation speeds by preventing full package scans for heavy dependencies
    experimental: {
        optimizePackageImports: [
            '@zegocloud/zego-uikit-prebuilt',
            'three',
            'swiper',
            'chart.js',
            'react-icons',
            'lucide-react'
        ]
    }
};

export default nextConfig;