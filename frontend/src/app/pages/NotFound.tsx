'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function NotFound() {
  const router = useRouter();
  const { user, t } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?keyword=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    } else {
      router.push('/');
    }
  };

  const isAdmin = user?.roles?.includes('admin') || user?.role === 'admin';
  const isSupplier = user?.role === 'supplier';

  return (
    <div className="notfound-wrapper">
      <div className="notfound-container">
        <div className="notfound-content">
          <div className="notfound-badge">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{t('404_error') || 'Error 404'}</span>
          </div>

          <h1 className="notfound-title" id="notfound-heading">404</h1>
          <h2 className="notfound-subtitle">{t('page_not_found_title') || 'Lost in Sourcing?'}</h2>

          <p className="notfound-text">
            {t('page_not_found_desc') ||
              "We couldn't find the page you are looking for. The link might be broken, or the page has moved. Let's get you back on track!"}
          </p>

          <form onSubmit={handleSearch} className="notfound-search">
            <input
              type="text"
              className="notfound-search-input"
              placeholder={t('search_products_placeholder') || 'Search products, suppliers, categories...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="notfound-search-input-field"
            />
            <button type="submit" className="notfound-search-btn" aria-label="Search">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </form>

          <div className="notfound-actions">
            <button onClick={handleGoBack} className="notfound-btn notfound-btn-secondary" id="notfound-btn-back">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              {t('go_back') || 'Go Back'}
            </button>

            <Link href="/" className="notfound-btn notfound-btn-primary" id="notfound-btn-home">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {t('back_home') || 'Back to Home'}
            </Link>
          </div>


        </div>
      </div>
    </div>
  );
}
