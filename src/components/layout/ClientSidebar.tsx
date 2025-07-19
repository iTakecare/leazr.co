import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Laptop,
  Clock,
  Package,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import Logo from "./Logo";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
  color: string;
  badge?: string;
  isNew?: boolean;
  moduleSlug?: string;
}

const ClientSidebar = ({ className, onLinkClick }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Tous les éléments de menu possibles avec leurs modules associés
  const allSidebarItems: MenuItem[] = [
    { label: "Tableau de bord", icon: LayoutDashboard, href: "/client/dashboard", color: "blue" },
    { label: "Équipements", icon: Laptop, href: "/client/equipment", color: "slate" },
    { label: "Contrats", icon: FileText, href: "/client/contracts", moduleSlug: "contracts", color: "emerald" },
    { label: "Demandes en cours", icon: Clock, href: "/client/requests", badge: "3", isNew: true, moduleSlug: "crm", color: "orange" },
    { label: "Catalogue", icon: Package, href: "/client/catalog", moduleSlug: "catalog", color: "violet" },
    { label: "Support", icon: HelpCircle, href: "/client/support", moduleSlug: "support", color: "pink" },
    { label: "Paramètres", icon: Settings, href: "/client/settings", color: "gray" },
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
    const fetchEnabledModules = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        console.log("Récupération des modules activés pour l'utilisateur:", user.id);
        
        // Récupérer d'abord le profil de l'utilisateur pour obtenir company_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error("Erreur lors de la récupération du profil:", profileError);
          setLoading(false);
          return;
        }
        
        if (!profile?.company_id) {
          console.warn("Aucune entreprise associée à cet utilisateur");
          setLoading(false);
          return;
        }
        
        // Récupérer les modules activés pour l'entreprise
        const { data: companyModules, error: modulesError } = await supabase
          .from('company_modules')
          .select(`
            enabled,
            modules (
              slug
            )
          `)
          .eq('company_id', profile.company_id)
          .eq('enabled', true);
        
        if (modulesError) {
          console.error("Erreur lors de la récupération des modules:", modulesError);
          // En cas d'erreur, afficher tous les modules pour les clients
          setEnabledModules(['contracts', 'catalog', 'crm', 'support']);
        } else {
          const modulesSlugs = companyModules?.map(cm => cm.modules?.slug).filter(Boolean) || [];
          console.log("Modules activés:", modulesSlugs);
          // Si aucun module configuré, afficher tous les modules essentiels
          if (modulesSlugs.length === 0) {
            setEnabledModules(['contracts', 'catalog', 'crm', 'support']);
          } else {
            setEnabledModules(modulesSlugs);
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement des modules:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEnabledModules();
  }, [user]);

  // Filtrer les éléments de menu en fonction des modules activés
  const sidebarItems = allSidebarItems.filter(item => {
    // Toujours afficher les éléments sans moduleSlug (dashboard, paramètres)
    if (!item.moduleSlug) return true;
    
    // Afficher seulement si le module est activé
    return enabledModules.includes(item.moduleSlug);
  });


  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavigation = (href: string) => {
    console.log("Navigation vers:", href, "depuis:", location.pathname);
    navigate(href);
    onLinkClick?.();
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Afficher un loader pendant le chargement des modules
  if (loading) {
    return (
      <aside className={cn(
        "h-screen sticky top-0 transition-all duration-500 border-r border-r-primary/5 shadow-xl shadow-primary/5 bg-gradient-to-br from-background via-background/95 to-primary/5",
        collapsed ? "w-[80px]" : "w-[280px]",
        className
      )}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </aside>
    );
  }

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 md:hidden bg-background/90 backdrop-blur-sm shadow-lg rounded-full hover:bg-primary/20 transition-all"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5 text-primary" />
          <span className="sr-only">Menu</span>
        </Button>
        
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[280px] border-0 bg-gradient-to-br from-background via-background/95 to-primary/5">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-center p-4 border-b">
                <Logo showText={true} logoSize="md" />
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="rounded-full ml-auto">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <nav className="flex-1 px-2 py-4">
                <ul className="space-y-2">
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem
                      key={item.href}
                      item={item}
                      isActive={isActive}
                      collapsed={false}
                      onLinkClick={() => {
                        onLinkClick?.();
                        setMobileOpen(false);
                      }}
                    />
                  ))}
                </ul>
              </nav>
              
              <SidebarUserSection />
            </div>
          </SheetContent>
        </Sheet>
      </>
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
          collapsed ? "justify-center" : "px-6 justify-start"
        )}>
          <Logo showText={!collapsed} logoSize="md" />
          
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
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <SidebarMenuItem
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
                onLinkClick={() => {
                  handleNavigation(item.href);
                }}
              />
            ))}
          </ul>
        </nav>
        
        <SidebarUserSection />
        
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

export default ClientSidebar;
