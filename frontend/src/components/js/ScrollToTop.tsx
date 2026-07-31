import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const ScrollToTop = () => {
    const location = usePathname();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location]);

    return null;
};

export default ScrollToTop;
