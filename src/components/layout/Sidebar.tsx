import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Logo from "./Logo";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";
import { supabase } from "@/integrations/supabase/client";

const Sidebar = ({ items }: { items: any[] }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Récupérer l'URL de l'avatar lors du chargement du composant
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Erreur lors de la récupération des données utilisateur:", error);
          return;
        }
        
        setAvatarUrl(data?.avatar_url || null);
      } catch (error) {
        console.error("Erreur lors de la récupération des données utilisateur:", error);
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleToggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  // Génère les initiales de l'utilisateur
  const getUserInitials = () => {
    if (!user) return "";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "";
  };

  // Obtient le nom d'affichage de l'utilisateur
  const getUserDisplayName = () => {
    if (!user) return "";
    
    if (user.first_name) {
      return `${user.first_name} ${user.last_name || ''}`;
    }
    return user.email?.split('@')[0] || "";
  };

  // Obtient le rôle de l'utilisateur
  const getUserRole = () => {
    if (!user) return "";
    
    if (isAdmin()) return "Administrateur";
    if (user.partner_id) return "Partenaire";
    if (user.ambassador_id) return "Ambassadeur";
    if (user.client_id) return "Client";
    
    return "Utilisateur";
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        <Logo showText={!collapsed} />
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleCollapse}
            className="rounded-full"
          >
            {collapsed ? (
              <ChevronsRight className="h-5 w-5" />
            ) : (
              <ChevronsLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          {items.map((item, index) => (
            <SidebarMenuItem
              key={index}
              item={item}
              collapsed={collapsed}
              isActive={location.pathname === item.href}
            />
          ))}
        </nav>
      </div>

      <SidebarUserSection
        collapsed={collapsed}
        avatarUrl={avatarUrl}
        getUserInitials={getUserInitials}
        getUserDisplayName={getUserDisplayName}
        getUserRole={getUserRole}
        handleLogout={handleLogout}
      />
    </aside>
  );
};

export default Sidebar;
