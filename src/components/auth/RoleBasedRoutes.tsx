
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export const RoleBasedRoutes = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  console.log('🔐 ROLE BASED ROUTES - Current location:', location.pathname);
  console.log('🔐 ROLE BASED ROUTES - User:', user?.email, 'Role:', user?.role);
  
  if (isLoading) {
    console.log('🔐 ROLE BASED ROUTES - Loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    console.log('🔐 ROLE BASED ROUTES - No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // System routes like /ambassadors/* should not be redirected
  const systemRoutes = ['/admin/', '/ambassador/', '/ambassadors/', '/client/', '/contracts/'];
  const isSystemRoute = systemRoutes.some(route => location.pathname.startsWith(route));
  
  if (isSystemRoute) {
    console.log('🔐 ROLE BASED ROUTES - System route detected, rendering outlet');
    return <Outlet />;
  }

  // Reserved keywords that should not be treated as company slugs
  const reservedKeywords = ['admin', 'ambassadors', 'client', 'api', 'dashboard', 'login', 'register', 'contracts', 'solutions', 'services', 'ressources', 'about', 'a-propos', 'contact', 'support', 'help', 'catalog', 'products', 'pricing', 'tarifs', 'features', 'blog', 'news', 'home', 'offers'];
  
  // Check if the current path looks like a company slug URL
  const pathMatch = location.pathname.match(/^\/([^\/]+)\/(catalog|products|panier|demande)/);
  if (pathMatch) {
    const firstSegment = pathMatch[1];
    // Only treat as company slug URL if it's not a reserved keyword
    if (!reservedKeywords.includes(firstSegment.toLowerCase())) {
      console.log('🔐 ROLE BASED ROUTES - Company slug URL detected, skipping redirection');
      return <Outlet />;
    }
  }

  // For old system routes without company slug, redirect to home
  const currentPath = location.pathname;
  
  if (currentPath === "/" || currentPath === "/dashboard") {
    console.log('🔐 ROLE BASED ROUTES - Redirecting to home for slug-based routing');
    return <Navigate to="/" replace />;
  }

  console.log('🔐 ROLE BASED ROUTES - Rendering outlet');
  return <Outlet />;
};
