
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, Calculator, FileText,
  ChevronRight, ChevronLeft, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Logo from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";
import MobileSidebar from "./MobileSidebar";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const AmbassadorSidebar = ({ className, onLinkClick }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const menuItems: MenuItem[] = [
    { label: "Tableau de bord", icon: LayoutDashboard, href: "/ambassador/dashboard" },
    { label: "Clients", icon: Users, href: "/ambassador/clients" },
    { label: "Calculateur", icon: Calculator, href: "/ambassador/create-offer" },
    { label: "Offres", icon: FileText, href: "/ambassador/offers" },
    { label: "Catalogue", icon: Package, href: "/ambassador/catalog" },
  ];

  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Erreur lors de la récupération de l'avatar:", error);
          return;
        }
        
        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l'avatar:", err);
      }
    };
    
    fetchAvatar();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
      toast.success("Déconnexion réussie");
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const isActive = (href: string) => {
    if (href === "/ambassador/dashboard" && location.pathname === "/ambassador/dashboard") {
      return true;
    }
    return location.pathname.startsWith(href) && href !== "/ambassador/dashboard";
  };

  const getUserInitials = () => {
    if (!user) return "IT";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "IT";
  };

  const getUserDisplayName = () => {
    if (!user) return "Ambassadeur";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.email) {
      return user.email;
    }
    return "Ambassadeur";
  };
  
  const getUserRole = () => {
    return "Ambassadeur";
  };

  if (isMobile) {
    return (
      <MobileSidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        menuItems={menuItems}
        isActive={isActive}
        onLinkClick={onLinkClick}
        avatarUrl={avatarUrl}
        getUserInitials={getUserInitials}
        getUserDisplayName={getUserDisplayName}
        getUserRole={getUserRole}
        handleLogout={handleLogout}
      />
    );
  }

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 transition-all duration-500 border-r border-r-primary/5 shadow-xl shadow-primary/5 bg-gradient-to-br from-background via-background/95 to-primary/5",
        collapsed ? "w-[80px]" : "w-[280px]",
        className
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn(
          "flex items-center p-4 mb-2 transition-all duration-300",
          collapsed ? "justify-center" : "px-6 justify-between"
        )}>
          <Logo showText={!collapsed} />
          
          {!collapsed && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCollapsed(true)} 
              className="rounded-full hover:bg-primary/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <SidebarMenuItem 
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
                onLinkClick={onLinkClick}
              />
            ))}
          </ul>
        </nav>
        
        <SidebarUserSection
          collapsed={collapsed}
          avatarUrl={avatarUrl}
          getUserInitials={getUserInitials}
          getUserDisplayName={getUserDisplayName}
          getUserRole={getUserRole}
          handleLogout={handleLogout}
        />
        
        {collapsed && (
          <div className="p-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCollapsed(false)} 
              className="w-full flex justify-center items-center h-10 rounded-xl hover:bg-primary/10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AmbassadorSidebar;
