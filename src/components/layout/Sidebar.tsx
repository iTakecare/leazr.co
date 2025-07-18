
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  Calculator,
  Crown,
  Receipt,
  Zap,
  MessageCircle
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
import { SidebarNotificationBadge } from "./SidebarNotificationBadge";
import CompanyLogo from "./CompanyLogo";

interface SidebarItem {
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  hasNotification?: boolean;
}

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

const Sidebar = ({ className, onLinkClick }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  const mainSidebarItems: SidebarItem[] = [
    { label: "Tableau de bord", icon: LayoutDashboard, href: "/admin/dashboard" },
    { label: "CRM", icon: Users, href: "/admin/clients" },
    { label: "Offres", icon: FileText, href: "/admin/offers" },
    { label: "Calculateur", icon: Calculator, href: "/admin/create-offer" },
    { label: "Générateur d'offres", icon: Zap, href: "/admin/custom-offer-generator" },
    { label: "Contrats", icon: FileText, href: "/admin/contracts" },
    { label: "Facturation", icon: Receipt, href: "/admin/invoicing" },
    { label: "Catalogue", icon: Package, href: "/admin/catalog" },
    { label: "Chat en direct", icon: MessageCircle, href: "/admin/chat", hasNotification: true },
  ];

  const bottomItems: SidebarItem[] = [
    { label: "Paramètres", icon: Settings, href: "/admin/settings" },
  ];

  // Ajouter les éléments SaaS pour l'admin SaaS
  if (user?.email === "ecommerce@itakecare.be") {
    bottomItems.unshift({ label: "Leazr SaaS", icon: Crown, href: "/admin/leazr-saas-dashboard" });
  }

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
          <SheetContent side="left" className="p-0 w-[280px] border-0 bg-card/95 backdrop-blur-xl">
            <div className="flex flex-col h-full relative">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-background/50 to-accent/[0.02] pointer-events-none" />
              
              <div className="flex items-center justify-between p-4 border-b border-border/20 relative z-10">
                <div className="flex items-center gap-3">
                  <CompanyLogo showText={false} logoSize="md" />
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Leazr
                    </h2>
                    <p className="text-xs text-muted-foreground">Administration</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="rounded-full h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <nav className="flex-1 px-3 py-4 relative z-10">
                <ul className="space-y-2">
                  {mainSidebarItems.map((item, index) => (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        onClick={() => {
                          onLinkClick?.();
                          setMobileOpen(false);
                        }}
                        className={cn(
                          "group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden",
                          isActive(item.href)
                            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                            : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 hover:scale-[1.02] hover:shadow-md"
                        )}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Active indicator */}
                        {isActive(item.href) && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground rounded-r-full" />
                        )}
                        
                        <div className="relative flex items-center">
                          <div className={cn(
                            "relative flex items-center justify-center rounded-lg transition-all duration-300 w-8 h-8 mr-3",
                            isActive(item.href) 
                              ? "bg-primary-foreground/20" 
                              : "group-hover:bg-primary/20"
                          )}>
                            <item.icon 
                              className={cn(
                                "h-5 w-5 transition-all duration-300",
                                isActive(item.href) && "stroke-[2.5px] scale-110"
                              )} 
                            />
                            {item.hasNotification && (
                              <SidebarNotificationBadge />
                            )}
                          </div>
                        </div>
                        <span className={cn(
                          "flex-1 text-left font-medium transition-all duration-300",
                          isActive(item.href) ? "text-primary-foreground font-semibold" : "text-foreground group-hover:text-primary"
                        )}>
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  ))}

                  {/* Separator */}
                  <li className="my-4">
                    <div className="mx-4 border-t border-border/40" />
                  </li>

                  {/* Bottom Items */}
                  {bottomItems.map((item, index) => (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        onClick={() => {
                          onLinkClick?.();
                          setMobileOpen(false);
                        }}
                        className={cn(
                          "group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden",
                          isActive(item.href)
                            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                            : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 hover:scale-[1.02] hover:shadow-md"
                        )}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        style={{ animationDelay: `${(mainSidebarItems.length + index) * 50}ms` }}
                      >
                        {/* Active indicator */}
                        {isActive(item.href) && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground rounded-r-full" />
                        )}
                        
                        <div className="relative flex items-center">
                          <div className={cn(
                            "relative flex items-center justify-center rounded-lg transition-all duration-300 w-8 h-8 mr-3",
                            isActive(item.href) 
                              ? "bg-primary-foreground/20" 
                              : "group-hover:bg-primary/20"
                          )}>
                            <item.icon 
                              className={cn(
                                "h-5 w-5 transition-all duration-300",
                                isActive(item.href) && "stroke-[2.5px] scale-110"
                              )} 
                            />
                          </div>
                        </div>
                        <span className={cn(
                          "flex-1 text-left font-medium transition-all duration-300",
                          isActive(item.href) ? "text-primary-foreground font-semibold" : "text-foreground group-hover:text-primary"
                        )}>
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              
              {user && (
                <div className="p-4 mx-3 mb-3 mt-auto relative z-10">
                  <div className="bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm border border-border/40 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <Avatar className="ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                          <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                            {user.email?.substring(0, 2).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="text-sm font-semibold truncate">
                          {user.first_name && user.last_name 
                            ? `${user.first_name} ${user.last_name}` 
                            : user.email}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          Administrateur
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 hover:shadow-md transition-all duration-300 rounded-lg"
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </Button>
                  </div>
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
        "h-screen sticky top-0 transition-all duration-500 border-r border-border/40 shadow-2xl bg-card/95 backdrop-blur-xl",
        collapsed ? "w-[72px]" : "w-[280px]",
        className
      )}
    >
      <div className="flex flex-col h-full relative">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-background/50 to-accent/[0.02] pointer-events-none" />
        
        <div className={cn(
          "flex items-center p-4 mb-6 transition-all duration-300 relative z-10 border-b border-border/20",
          collapsed ? "justify-center px-3" : "px-6 justify-between"
        )}>
          <div className="flex items-center gap-3">
            <CompanyLogo showText={false} logoSize="md" />
            {!collapsed && (
              <div className="flex flex-col">
                <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Leazr
                </h2>
                <p className="text-xs text-muted-foreground">Administration</p>
              </div>
            )}
          </div>
          
          {!collapsed && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCollapsed(true)} 
              className="rounded-full hover:bg-primary/10 h-8 w-8 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <nav className="flex-1 px-3 py-2 relative z-10">
          <TooltipProvider delayDuration={200}>
            <ul className="space-y-2">
              {/* Main Items */}
              {mainSidebarItems.map((item, index) => (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleNavigation(item.href)}
                        className={cn(
                          "group w-full flex items-center transition-all duration-300 relative overflow-hidden",
                          collapsed ? "justify-center px-3 py-3 rounded-lg" : "px-4 py-3 rounded-xl",
                          isActive(item.href)
                            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 scale-105" 
                            : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 hover:scale-[1.02] hover:shadow-md"
                        )}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Active indicator */}
                        {isActive(item.href) && !collapsed && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground rounded-r-full" />
                        )}
                        
                        <div className="relative flex items-center">
                          <div className={cn(
                            "relative flex items-center justify-center rounded-lg transition-all duration-300",
                            collapsed ? "w-6 h-6" : "w-8 h-8 mr-3",
                            isActive(item.href) 
                              ? "bg-primary-foreground/20" 
                              : "group-hover:bg-primary/20"
                          )}>
                            <item.icon 
                              className={cn(
                                "transition-all duration-300", 
                                collapsed ? "h-4 w-4" : "h-5 w-5",
                                isActive(item.href) && "stroke-[2.5px] scale-110"
                              )} 
                            />
                            {item.hasNotification && (
                              <SidebarNotificationBadge />
                            )}
                          </div>
                        </div>
                        {!collapsed && (
                          <span className={cn(
                            "flex-1 text-left font-medium transition-all duration-300",
                            isActive(item.href) ? "text-primary-foreground font-semibold" : "text-foreground group-hover:text-primary"
                          )}>
                            {item.label}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" className="font-medium bg-popover border shadow-lg">
                        <p>{item.label}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </li>
              ))}
              
              {/* Separator */}
              <li className="my-4">
                <div className={cn(
                  "transition-all duration-300",
                  collapsed ? "mx-2 border-t border-border/40" : "mx-4 border-t border-border/40"
                )} />
              </li>
              
              {/* Bottom Items */}
              {bottomItems.map((item, index) => (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleNavigation(item.href)}
                        className={cn(
                          "group w-full flex items-center transition-all duration-300 relative overflow-hidden",
                          collapsed ? "justify-center px-3 py-3 rounded-lg" : "px-4 py-3 rounded-xl",
                          isActive(item.href)
                            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 scale-105" 
                            : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 hover:scale-[1.02] hover:shadow-md"
                        )}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        style={{ animationDelay: `${(mainSidebarItems.length + index) * 50}ms` }}
                      >
                        {/* Active indicator */}
                        {isActive(item.href) && !collapsed && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground rounded-r-full" />
                        )}
                        
                        <div className="relative flex items-center">
                          <div className={cn(
                            "relative flex items-center justify-center rounded-lg transition-all duration-300",
                            collapsed ? "w-6 h-6" : "w-8 h-8 mr-3",
                            isActive(item.href) 
                              ? "bg-primary-foreground/20" 
                              : "group-hover:bg-primary/20"
                          )}>
                            <item.icon 
                              className={cn(
                                "transition-all duration-300", 
                                collapsed ? "h-4 w-4" : "h-5 w-5",
                                isActive(item.href) && "stroke-[2.5px] scale-110"
                              )} 
                            />
                          </div>
                        </div>
                        {!collapsed && (
                          <span className={cn(
                            "flex-1 text-left font-medium transition-all duration-300",
                            isActive(item.href) ? "text-primary-foreground font-semibold" : "text-foreground group-hover:text-primary"
                          )}>
                            {item.label}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" className="font-medium bg-popover border shadow-lg">
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
            "transition-all duration-300 mt-auto relative z-10",
            collapsed ? "p-2" : "p-4 mx-3 mb-3"
          )}>
            {!collapsed ? (
              <div className="bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm border border-border/40 rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <Avatar className="ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                      <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                        {user.email?.substring(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm font-semibold truncate">
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}` 
                        : user.email}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      Administrateur
                    </p>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 hover:shadow-md transition-all duration-300 rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            ) : (
              <TooltipProvider delayDuration={200}>
                <div className="flex flex-col items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Avatar className="ring-2 ring-primary/20 ring-offset-2 ring-offset-background w-8 h-8">
                          <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold text-xs">
                            {user.email?.substring(0, 2).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-background" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium bg-popover border shadow-lg">
                      <p>{user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}` 
                        : user.email}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleLogout}
                        className="w-8 h-8 flex justify-center text-destructive/80 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all duration-300"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="sr-only">Déconnexion</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium bg-popover border shadow-lg">
                      <p>Déconnexion</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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

export default Sidebar;
