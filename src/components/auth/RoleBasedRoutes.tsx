
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { Logger } from "@/utils/logger";

export const RoleBasedRoutes = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  Logger.security('Role-based route check', { 
    path: location.pathname, 
    userRole: user?.role,
    hasUser: !!user 
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    Logger.security('Unauthorized access attempt', { path: location.pathname });
    return <Navigate to="/login" replace />;
  }

  // Reserved keywords that should not be treated as company slugs
  const reservedKeywords = ['admin', 'ambassadors', 'client', 'api', 'dashboard', 'login', 'register'];
  
  // Check if the current path looks like a company slug URL
  const pathMatch = location.pathname.match(/^\/([^\/]+)\/(catalog|products|panier|demande)/);
  if (pathMatch) {
    const firstSegment = pathMatch[1];
    // Only treat as company slug URL if it's not a reserved keyword
    if (!reservedKeywords.includes(firstSegment.toLowerCase())) {
      Logger.security('Company slug URL access', { slug: firstSegment, userRole: user.role });
      return <Outlet />;
    }
  }

  // Default redirection based on role
  const currentPath = location.pathname;
  
  if (currentPath === "/" || currentPath === "/dashboard") {
    Logger.security('Role-based redirection', { role: user.role, from: currentPath });
    
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

  return <Outlet />;
};
