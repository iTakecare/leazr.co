import { Navigate, useParams } from "react-router-dom";
import PublicSlugCatalog from "@/components/public/PublicSlugCatalog";
import PublicNotFound from "@/components/public/PublicNotFound";

const CompanySlugGuard = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  // Reserved keywords that should not be treated as company slugs
  const reservedKeywords = ['admin', 'ambassador', 'ambassadors', 'client', 'api', 'dashboard', 'login', 'register', 'solutions', 'services', 'about', 'contact', 'support', 'help', 'catalog', 'products', 'pricing', 'features', 'blog', 'news'];
  
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
    return (
      <PublicNotFound 
        title="Page non disponible"
        message={`"${companySlug}" est un mot-clé réservé du système. Cette URL ne correspond pas à un catalogue d'entreprise.`}
        showCatalogLink={true}
      />
    );
  }
  
  console.log('🛡️ COMPANY SLUG GUARD - Valid company slug, rendering PublicSlugCatalog for:', companySlug);
  return <PublicSlugCatalog />;
};

export default CompanySlugGuard;