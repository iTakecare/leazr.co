
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, Calculator, FileText,
  LogOut
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Logo from "./Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger
} from "@/components/ui/sidebar";

const AmbassadorSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const menuItems = [
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

  return (
    <>
      <Sidebar className="shadow-lg">
        <SidebarRail />
        <SidebarHeader className="flex items-center justify-between">
          <Logo showText={true} />
          <SidebarTrigger />
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      isActive={isActive(item.href)}
                      tooltip={item.label}
                      onClick={() => navigate(item.href)}
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className="mt-auto">
          <div className="flex items-center justify-between p-4 border-t">
            <div className="flex items-center">
              <Avatar className="h-9 w-9 mr-2">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={user?.email || "Avatar"} />
                ) : (
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.first_name || user?.email || "Ambassadeur"}</span>
                <span className="text-xs text-muted-foreground">Ambassadeur</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="ml-4 p-2 rounded-full hover:bg-primary/10"
              title="Déconnexion"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
};

export default AmbassadorSidebar;
