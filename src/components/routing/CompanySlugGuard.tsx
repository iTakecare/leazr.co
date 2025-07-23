import { Navigate, useParams } from "react-router-dom";
import PublicSlugCatalog from "@/components/public/PublicSlugCatalog";

const CompanySlugGuard = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  // Reserved keywords that should not be treated as company slugs
  const reservedKeywords = ['admin', 'ambassadors', 'client', 'api', 'dashboard', 'login', 'register'];
  
  console.log('🛡️ COMPANY SLUG GUARD - Checking slug:', companySlug);
  
  if (!companySlug) {
    console.log('🛡️ COMPANY SLUG GUARD - No slug provided, redirecting to home');
    return <Navigate to="/" replace />;
  }
  
  // Check if the slug is a reserved keyword
  if (reservedKeywords.includes(companySlug.toLowerCase())) {
    console.log('🛡️ COMPANY SLUG GUARD - Reserved keyword detected, redirecting to home');
    return <Navigate to="/" replace />;
  }
  
  console.log('🛡️ COMPANY SLUG GUARD - Valid company slug, rendering PublicSlugCatalog');
  return <PublicSlugCatalog />;
};

export default CompanySlugGuard;