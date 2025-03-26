import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Package,
  Settings,
  Calculator,
  ShieldCheck,
  Menu,
  ChevronRight,
  ChevronLeft,
  X,
  Receipt,
  FileText,
  LogOut
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Logo from "./Logo";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const Sidebar = ({ className, onLinkClick }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { user, signOut } = useAuth();
  
  // Ajouter console.log pour déboguer
  useEffect(() => {
    console.log("User dans Sidebar:", user);
  }, [user]);
  
  const menuItems: MenuItem[] = [
    { label: "Tableau de bord", icon: LayoutDashboard, href: "/" },
    { label: "CRM", icon: Briefcase, href: "/clients" },
    { label: "Offres", icon: Receipt, href: "/offers" },
    { label: "Contrats", icon: FileText, href: "/contracts" },
    { label: "Catalogue", icon: Package, href: "/catalog" },
    { label: "Pack iTakecare", icon: ShieldCheck, href: "/i-take-care" },
    { label: "Calculateur", icon: Calculator, href: "/create-offer" },
    { label: "Paramètres", icon: Settings, href: "/settings" },
  ];

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
              <div className="flex items-center justify-between p-4 border-b">
                <Logo />
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <nav className="flex-1 px-2 py-4">
                <ul className="space-y-1">
                  {menuItems.map((item) => (
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
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              
              <div className="p-4 mt-auto border-t">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar>
                    <AvatarFallback className="bg-primary/20 text-primary">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground">{getUserRole()}</p>
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
          <TooltipProvider delayDuration={200}>
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.href}
                        onClick={onLinkClick}
                        className={cn(
                          "flex items-center py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
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
                            collapsed ? "" : "mr-3",
                            isActive(item.href) && "stroke-[2.5px]"
                          )} 
                        />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
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
        
        <div className={cn(
          "p-4 transition-all duration-300 mt-auto mx-2 mb-4 border-t border-t-primary/10 pt-4",
          collapsed ? "px-2" : ""
        )}>
          {!collapsed ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/20 text-primary">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{getUserDisplayName()}</p>
                  <p className="text-xs text-muted-foreground">{getUserRole()}</p>
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
