
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

  // Check if the current path looks like a company slug URL
  const isCompanySlugUrl = location.pathname.match(/^\/[^\/]+\/(catalog|products|panier|demande)/);
  
  if (isCompanySlugUrl) {
    console.log('🔐 ROLE BASED ROUTES - Company slug URL detected, skipping redirection');
    return <Outlet />;
  }

  // Default redirection based on role
  const currentPath = location.pathname;
  
  if (currentPath === "/" || currentPath === "/dashboard") {
    console.log('🔐 ROLE BASED ROUTES - Redirecting based on role:', user.role);
    
    switch (user.role) {
      case 'admin':
      case 'super_admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'ambassador':
        return <Navigate to="/ambassador" replace />;
      case 'client':
        return <Navigate to="/client" replace />;
      case 'partner':
        return <Navigate to="/partner" replace />;
      default:
        return <Navigate to="/admin/dashboard" replace />;
    }
  }

  console.log('🔐 ROLE BASED ROUTES - Rendering outlet');
  return <Outlet />;
};
