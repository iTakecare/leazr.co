import { Navigate, useParams } from "react-router-dom";
import PublicSlugCatalog from "@/components/public/PublicSlugCatalog";

const CompanySlugGuard = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  // Reserved keywords that should not be treated as company slugs
  const reservedKeywords = ['admin', 'ambassador', 'ambassadors', 'client', 'api', 'dashboard', 'login', 'register'];
  
  console.log('🛡️ COMPANY SLUG GUARD - Checking slug:', companySlug, {
    pathname: window.location.pathname,
    href: window.location.href
  });
  
  if (!companySlug) {
    console.error('🛡️ COMPANY SLUG GUARD - No slug provided, redirecting to home');
    return <Navigate to="/" replace />;
  }
  
  // Check if the slug is a reserved keyword
  if (reservedKeywords.includes(companySlug.toLowerCase())) {
    console.error('🛡️ COMPANY SLUG GUARD - Reserved keyword detected:', companySlug);
    return <Navigate to="/" replace />;
  }
  
  console.log('🛡️ COMPANY SLUG GUARD - Valid company slug, rendering PublicSlugCatalog for:', companySlug);
  return <PublicSlugCatalog />;
};

export default CompanySlugGuard;