'use client';
import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/axiosConfig';
import Link from 'next/link';
import { getImgUrl } from '@/utils/imageConfig';

interface BlogPost {
    _id: string;
    title: string;
    slug: string;
    content: string;
    image: string;
    author: string;
    createdAt: string;
}

const DEFAULT_BLOG_IMAGE = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop';

const Blog = () => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);

    // Search and Category Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/blog');
            setPosts(data || []);
        } catch (err) {
            console.error('Failed to load blog articles:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPostDetail = async (slug: string) => {
        try {
            const { data } = await api.get(`/blog/${slug}`);
            setSelectedPost(data);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Failed to load blog detail:', err);
        }
    };

    // Filter posts by active category & search query
    const filteredPosts = useMemo(() => {
        let result = posts;
        if (activeCategory !== 'All') {
            result = result.filter(p => (p.category || 'General').toLowerCase() === activeCategory.toLowerCase());
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
        }
        return result;
    }, [posts, activeCategory, searchQuery]);

    const featuredPost = useMemo(() => {
        return filteredPosts.length > 0 && !searchQuery && activeCategory === 'All' ? filteredPosts[0] : null;
    }, [filteredPosts, searchQuery, activeCategory]);

    const regularPosts = useMemo(() => {
        return featuredPost ? filteredPosts.slice(1) : filteredPosts;
    }, [filteredPosts, featuredPost]);

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", paddingBottom: '60px' }}>
            
            {/* Top Control Bar / Hero Header */}
            <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '36px 20px 28px' }}>
                <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
                    
                    {/* Breadcrumbs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '12px' }}>
                        <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
                        <span>/</span>
                        <span style={{ color: 'var(--primary-color, #ff6a00)' }}>Blog & Insights</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                            <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>
                                Marketplace Insights & Articles
                            </h1>
                            <p style={{ color: '#64748b', fontSize: '15px', marginTop: '6px', fontWeight: 500, maxWidth: '640px', margin: '6px 0 0' }}>
                                Expert trade blueprints, manufacturing updates, seasonal trends, and sourcing guides.
                            </p>
                        </div>

                        {/* Search Input Box */}
                        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                            <svg width="18" height="18" fill="none" stroke="#94a3b8" strokeWidth="2.2" viewBox="0 0 24 24" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search articles..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px 12px 42px',
                                    borderRadius: '100px',
                                    border: '1.5px solid #e2e8f0',
                                    background: '#f8fafc',
                                    fontSize: '14px',
                                    outline: 'none',
                                    color: '#0f172a',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    {/* Category Filter Chips */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
                        {['All', 'Sourcing', 'Logistics', 'Market Trends', 'Guides'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '100px',
                                    border: activeCategory === cat ? 'none' : '1px solid #e2e8f0',
                                    background: activeCategory === cat ? 'var(--primary-color, #ff6a00)' : '#ffffff',
                                    color: activeCategory === cat ? '#ffffff' : '#475569',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: activeCategory === cat ? '0 4px 14px color-mix(in srgb, var(--primary-color, #ff6a00) 30%, transparent)' : 'none'
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ maxWidth: '1240px', margin: '36px auto 0', padding: '0 20px' }}>
                {selectedPost ? (
                    /* Detail Reader View */
                    <div style={{ maxWidth: '880px', margin: '0 auto', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '44px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.04)' }}>
                        <button
                            onClick={() => setSelectedPost(null)}
                            style={{
                                background: '#f1f5f9',
                                border: 'none',
                                color: '#0f172a',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '28px',
                                padding: '10px 18px',
                                borderRadius: '100px',
                                transition: 'all 0.2s'
                            }}
                        >
                            ← Back to all articles
                        </button>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                            <span style={{ background: 'color-mix(in srgb, var(--primary-color, #ff6a00) 12%, transparent)', color: 'var(--primary-color, #ff6a00)', fontSize: '12px', fontWeight: 800, padding: '4px 12px', borderRadius: '100px', textTransform: 'uppercase' }}>
                                Article
                            </span>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                                {new Date(selectedPost.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </span>
                        </div>

                        <h1 style={{ fontSize: '34px', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
                            {selectedPost.title}
                        </h1>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px' }}>
                                {selectedPost.author ? selectedPost.author.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{selectedPost.author || 'Admin'}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Verified Author</div>
                            </div>
                        </div>

                        <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '32px', border: '1px solid #f1f5f9' }}>
                            <img
                                src={selectedPost.image ? getImgUrl(selectedPost.image) : DEFAULT_BLOG_IMAGE}
                                alt={selectedPost.title}
                                style={{ width: '100%', maxHeight: '460px', objectFit: 'cover', display: 'block' }}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.src !== DEFAULT_BLOG_IMAGE) {
                                        target.src = DEFAULT_BLOG_IMAGE;
                                    }
                                }}
                            />
                        </div>

                        <div style={{ fontSize: '16.5px', color: '#334155', lineHeight: 1.85, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                            {selectedPost.content}
                        </div>
                    </div>
                ) : (
                    /* Articles Listing Grid View */
                    loading ? (
                        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
                            <div style={{ width: '44px', height: '44px', border: '3.5px solid #e2e8f0', borderTop: '3.5px solid var(--primary-color, #ff6a00)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.9s linear infinite' }} />
                            <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 600 }}>Loading articles...</p>
                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : filteredPosts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>No articles found</h3>
                            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>Try searching with a different keyword.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
                            
                            {/* Featured Article Card (First Item) */}
                            {featuredPost && (
                                <div
                                    onClick={() => fetchPostDetail(featuredPost.slug)}
                                    style={{
                                        background: '#ffffff',
                                        borderRadius: '24px',
                                        border: '1px solid #e2e8f0',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.04)',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                                        transition: 'transform 0.25s ease, box-shadow 0.25s ease'
                                    }}
                                >
                                    <div style={{ height: '340px', minHeight: '100%', overflow: 'hidden', position: 'relative' }}>
                                        <img
                                            src={featuredPost.image ? getImgUrl(featuredPost.image) : DEFAULT_BLOG_IMAGE}
                                            alt={featuredPost.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                if (target.src !== DEFAULT_BLOG_IMAGE) {
                                                    target.src = DEFAULT_BLOG_IMAGE;
                                                }
                                            }}
                                        />
                                        <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', color: '#ffffff', padding: '6px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                            FEATURED STORY
                                        </div>
                                    </div>

                                    <div style={{ padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '13px', color: 'var(--primary-color, #ff6a00)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                                            Featured Insight
                                        </div>

                                        <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', margin: '0 0 14px 0', lineHeight: 1.3, letterSpacing: '-0.02em' }}>
                                            {featuredPost.title}
                                        </h2>

                                        <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
                                            {featuredPost.content.replace(/<[^>]*>/g, '')}
                                        </p>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: 'auto' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
                                                    {featuredPost.author ? featuredPost.author.charAt(0).toUpperCase() : 'A'}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>By {featuredPost.author || 'Admin'}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(featuredPost.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                                                </div>
                                            </div>

                                            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary-color, #ff6a00)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                Read Story →
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Regular Articles Grid */}
                            {regularPosts.length > 0 && (
                                <div>
                                    {featuredPost && (
                                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '20px', letterSpacing: '-0.01em' }}>
                                            Latest Articles
                                        </h3>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '28px' }}>
                                        {regularPosts.map((post) => (
                                            <div
                                                key={post._id}
                                                onClick={() => fetchPostDetail(post.slug)}
                                                style={{
                                                    background: '#ffffff',
                                                    borderRadius: '20px',
                                                    border: '1px solid #e2e8f0',
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                                                    boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.03)',
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}
                                            >
                                                <div style={{ height: '210px', overflow: 'hidden', position: 'relative' }}>
                                                    <img
                                                        src={post.image ? getImgUrl(post.image) : DEFAULT_BLOG_IMAGE}
                                                        alt={post.title}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            if (target.src !== DEFAULT_BLOG_IMAGE) {
                                                                target.src = DEFAULT_BLOG_IMAGE;
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0', lineHeight: 1.4, height: '50px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>
                                                        {post.title}
                                                    </h3>

                                                    <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px 0', height: '64px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', lineHeight: 1.55 } as any}>
                                                        {post.content.replace(/<[^>]*>/g, '')}
                                                    </p>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: '#64748b', fontWeight: 600, borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: 'auto' }}>
                                                        <span>By {post.author || 'Admin'}</span>
                                                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default Blog;
