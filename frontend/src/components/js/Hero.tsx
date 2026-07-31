import React from 'react';


const Hero = () => {
    return (
        <div className="hero container mt-4">
            <div className="hero-content">
                <div className="badge">LIMITED LAUNCH EDITION</div>
                <h1 className="hero-title">Next-Gen<br />Smart<br />Electronics</h1>
                <p className="hero-desc">
                    Discover the intersection of minimalist design and<br />
                    peak performance with our meticulously curated<br />
                    technology suites.
                </p>
                <div className="hero-actions d-flex gap-2">
                    <button className="btn-primary">Shop Collection</button>
                    <button className="btn-secondary">Watch Preview</button>
                </div>
            </div>
            <div className="hero-bg-overlay"></div>
        </div>
    );
};

export default Hero;
