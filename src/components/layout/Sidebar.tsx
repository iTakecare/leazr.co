import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Users, Package, Settings, 
  Calculator, Menu, ChevronRight, ChevronLeft, ChevronDown,
  X, Receipt, FileText, LogOut, FileSignature, BadgePercent, HeartHandshake, Building2
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
}

const Sidebar = ({ className, onLinkClick }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  
  const mainSidebarItems: MenuItem[] = [
    { label: "Tableau de bord", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Offres", icon: FileText, href: "/offers", badge: pendingOffersCount > 0 ? pendingOffersCount.toString() : undefined },
    { label: "Contrats", icon: FileSignature, href: "/contracts" },
    { label: "Catalogue", icon: Package, href: "/catalog" },
    { label: "Paramètres", icon: Settings, href: "/settings" },
  ];

  const crmSidebarItems: MenuItem[] = [
    { label: "Clients", icon: Users, href: "/clients" },
    { label: "Partenaires", icon: BadgePercent, href: "/partners" },
    { label: "Ambassadeurs", icon: HeartHandshake, href: "/ambassadors" },
  ];

  const leazrSidebarItems: MenuItem[] = [
    { label: "Clients Leazr.co", icon: Building2, href: "/leazr-clients" },
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

  useEffect(() => {
    const fetchPendingOffers = async () => {
      try {
        const { count, error } = await supabase
          .from('offers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (!error && count !== null) {
          setPendingOffersCount(count);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des offres en attente:", err);
      }
    };
    
    fetchPendingOffers();
  }, []);

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
    if (href === "/" && location.pathname === "/") {
      return true;
    }
    return location.pathname.startsWith(href) && href !== "/";
  };

  const isCrmActive = () => {
    return crmSidebarItems.some(item => isActive(item.href));
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
    if (!user) return "Admin Portal";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.email) {
      return user.email;
    }
    return "Admin Portal";
  };
  
  const getUserRole = () => {
    if (!user) return "Gestion complète";
    
    if (user.role) {
      return user.role;
    }
    
    if (user.partner_id) return "Partenaire";
    if (user.ambassador_id) return "Ambassadeur";
    if (user.client_id) return "Client";
    
    return "Gestion complète";
  };

  if (isMobile) {
    return (
      <MobileSidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        menuItems={[...mainSidebarItems, ...crmSidebarItems, ...leazrSidebarItems]}
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
          collapsed ? "justify-center" : "px-6 justify-start pl-20"
        )}>
          <Logo showText={false} logoSize="lg" className="scale-[2.5]" />
          
          {!collapsed && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCollapsed(true)} 
              className="rounded-full hover:bg-primary/10 ml-auto"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-1">
            {/* Section principale */}
            {mainSidebarItems.map((item) => (
              <SidebarMenuItem 
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
                onLinkClick={onLinkClick}
              />
            ))}
            
            {/* Séparateur */}
            <li className="my-4">
              <div className="border-t border-gray-200"></div>
            </li>
            
            {/* Menu CRM déroulant */}
            <li>
              <Collapsible open={crmOpen} onOpenChange={setCrmOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2 p-2 h-10 font-normal",
                      isCrmActive() && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <Briefcase className="h-5 w-5" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">CRM</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", crmOpen && "rotate-180")} />
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                {!collapsed && (
                  <CollapsibleContent className="space-y-1 ml-4">
                    {crmSidebarItems.map((item) => (
                      <SidebarMenuItem 
                        key={item.href}
                        item={item}
                        isActive={isActive}
                        collapsed={false}
                        onLinkClick={onLinkClick}
                      />
                    ))}
                  </CollapsibleContent>
                )}
              </Collapsible>
            </li>
            
            {/* Séparateur */}
            <li className="my-4">
              <div className="border-t border-gray-200"></div>
            </li>
            
            {/* Section label pour Plateforme Leazr */}
            {!collapsed && (
              <li className="px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Plateforme Leazr
                </span>
              </li>
            )}
            
            {/* Section Clients Leazr.co */}
            {leazrSidebarItems.map((item) => (
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

export default Sidebar;
