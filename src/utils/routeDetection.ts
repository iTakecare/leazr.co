/**
 * Utility to detect system pages where multi-tenant providers should be disabled
 */
export const isSystemRoute = (pathname: string): boolean => {
  const systemRoutes = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password'
  ];
  
  return systemRoutes.includes(pathname);
};

/**
 * Check if we're on homepage specifically
 */
export const isHomePage = (pathname: string): boolean => {
  return pathname === '/';
};