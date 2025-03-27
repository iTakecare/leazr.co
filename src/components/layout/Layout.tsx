import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import PageTransition from "./PageTransition";
import { Home, ShoppingBag, FileText, Users, Award, Settings, FileIcon } from "lucide-react";
import MobileNavDrawer from "./MobileNavDrawer";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Update navigation items to include icons for both mobile and desktop
  const navigationItems = [
    { label: "Tableau de bord", href: "/dashboard", icon: <Home className="h-4 w-4" /> },
    { label: "Catalogue", href: "/catalog", icon: <ShoppingBag className="h-4 w-4" /> },
    { label: "Offres", href: "/offers", icon: <FileText className="h-4 w-4" /> },
    { label: "Contrats", href: "/contracts", icon: <FileIcon className="h-4 w-4" /> },
    { label: "Clients", href: "/clients", icon: <Users className="h-4 w-4" /> },
    { label: "Partenaires", href: "/partners", icon: <Users className="h-4 w-4" /> },
    { label: "Ambassadeurs", href: "/ambassadors", icon: <Award className="h-4 w-4" /> },
    { label: "Paramètres", href: "/settings", icon: <Settings className="h-4 w-4" /> },
  ];

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Check if a menu item is active
  const isActive = (href: string) => {
    return location.pathname.startsWith(href);
  };

  // Handle link click (for mobile)
  const onLinkClick = () => {
    setMobileOpen(false);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "";
    
    const name = user.user_metadata?.full_name || "";
    const parts = name.split(" ");
    
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
      return parts[0][0].toUpperCase();
    } else {
      return "U";
    }
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return "Utilisateur";
    return user.user_metadata?.full_name || user.email || "Utilisateur";
  };

  // Get user role
  const getUserRole = () => {
    if (!user) return "Invité";
    return user.user_metadata?.role || "Utilisateur";
  };

  // Format menu items for sidebar
  const menuItems = navigationItems.map(item => ({
    label: item.label,
    href: item.href,
    icon: item.icon ? () => item.icon : Home,
  }));

  return (
    <>
      {/* Mobile navigation drawer - visible only on small screens */}
      <MobileNavDrawer 
        items={navigationItems}
        userAvatar={user?.user_metadata?.avatar_url}
        userName={getUserDisplayName()}
        userInitials={getUserInitials()}
        onLogout={handleLogout}
      />
      
      <div className="flex h-screen">
        {/* Keep existing Sidebar - it will be hidden on mobile screens */}
        <Sidebar
          menuItems={menuItems}
          isActive={isActive}
          onLinkClick={onLinkClick}
          avatarUrl={user?.user_metadata?.avatar_url}
          getUserInitials={getUserInitials}
          getUserDisplayName={getUserDisplayName}
          getUserRole={getUserRole}
          handleLogout={handleLogout}
        />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-auto">
          <Navbar 
            onMenuClick={() => setMobileOpen(true)}
          />
          
          <main className="flex-1 p-4 md:p-6">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;
