import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Start every new page at the top; without this a link clicked in the footer opens the next
// page already scrolled to the bottom.
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
