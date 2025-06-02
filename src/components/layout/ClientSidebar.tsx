import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Laptop,
  Clock,
  Package,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import Logo from "./Logo";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
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
    { label: "Tableau de bord", icon: LayoutDashboard, href: "/client/dashboard" },
    { label: "Contrats", icon: FileText, href: "/client/contracts", moduleSlug: "contracts" },
    { label: "Équipements", icon: Laptop, href: "/client/equipment", moduleSlug: "fleet_generator" },
    { label: "Demandes en cours", icon: Clock, href: "/client/requests", badge: "3", isNew: true, moduleSlug: "crm" },
    { label: "Catalogue", icon: Package, href: "/client/catalog", moduleSlug: "catalog" },
    { label: "Support", icon: HelpCircle, href: "/client/support", moduleSlug: "support" },
    { label: "Paramètres", icon: Settings, href: "/client/settings" },
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
          .select('module_slug, enabled')
          .eq('company_id', profile.company_id)
          .eq('enabled', true);
        
        if (modulesError) {
          console.error("Erreur lors de la récupération des modules:", modulesError);
        } else {
          const modulesSlugs = companyModules?.map(cm => cm.module_slug) || [];
          console.log("Modules activés:", modulesSlugs);
          setEnabledModules(modulesSlugs);
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
                <ul className="space-y-1">
                  {sidebarItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        onClick={() => {
                          onLinkClick?.();
                          setMobileOpen(false);
                        }}
                        className={cn(
                          "flex items-center py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-300",
                          isActive(item.href)
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-y-[-2px]"
                            : "hover:bg-primary/10 hover:text-primary hover:translate-y-[-2px]"
                        )}
                        aria-current={isActive(item.href) ? "page" : undefined}
                      >
                        <item.icon className={cn("mr-3 h-5 w-5", isActive(item.href) && "stroke-[2.5px]")} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge className="ml-auto bg-primary/20 text-primary hover:bg-primary/30">
                            {item.badge}
                          </Badge>
                        )}
                        {item.isNew && !item.badge && (
                          <Badge variant="outline" className="ml-auto text-xs border-primary/30 text-primary">
                            New
                          </Badge>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              
              {user && (
                <div className="p-4 border-t mt-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar>
                      <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {user.email?.substring(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium truncate">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}` 
                          : user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">Client</p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:shadow"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </Button>
                </div>
              )}
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
          <TooltipProvider delayDuration={200}>
            <ul className="space-y-1">
              {sidebarItems.map((item) => (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleNavigation(item.href)}
                        className={cn(
                          "w-full flex items-center py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                          collapsed ? "justify-center px-2" : "px-3",
                          isActive(item.href)
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-y-[-2px]" 
                            : "hover:bg-primary/10 hover:text-primary hover:translate-y-[-2px]"
                        )}
                        aria-current={isActive(item.href) ? "page" : undefined}
                      >
                        <item.icon 
                          className={cn(
                            "h-5 w-5 flex-shrink-0", 
                            collapsed ? "relative" : "mr-3",
                            isActive(item.href) && "stroke-[2.5px]"
                          )} 
                        />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.badge && (
                              <Badge className="ml-auto bg-primary/20 text-primary hover:bg-primary/30">
                                {item.badge}
                              </Badge>
                            )}
                            {item.isNew && !item.badge && (
                              <Badge variant="outline" className="ml-auto text-xs border-primary/30 text-primary">
                                New
                              </Badge>
                            )}
                          </>
                        )}
                        {collapsed && item.badge && (
                          <Badge className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 w-4 h-4 p-0 flex items-center justify-center text-[10px]">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" className="font-medium">
                        <p>{item.label}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </li>
              ))}
            </ul>
          </TooltipProvider>
        </nav>
        
        {user && (
          <div className={cn(
            "transition-all duration-300 mt-auto border-t border-t-primary/10 pt-4",
            collapsed ? "p-2" : "p-4 mx-2 mb-2"
          )}>
            {!collapsed ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar>
                    <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {user.email?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}` 
                        : user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">Client</p>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:shadow"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </>
            ) : (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleLogout}
                      className="w-full h-10 flex justify-center text-destructive/80 hover:bg-destructive/10 hover:text-destructive rounded-xl"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="sr-only">Déconnexion</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Déconnexion</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
        
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
