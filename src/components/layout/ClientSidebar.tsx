
import React from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Laptop,
  Clock,
  Package,
  LogOut,
  Calculator,
  Shield,
  User,
  Menu,
  ChevronRight
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

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const ClientSidebar = ({ className, onLinkClick }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

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

  const sidebarItems: MenuItem[] = [
    { label: "Tableau de bord", icon: LayoutDashboard, href: "/client/dashboard" },
    { label: "Contrats", icon: FileText, href: "/client/contracts" },
    { label: "Équipements", icon: Laptop, href: "/client/equipment" },
    { label: "Demandes en cours", icon: Clock, href: "/client/requests" },
    { label: "Catalogue", icon: Package, href: "/client/catalog" },
    { label: "Calculateur", icon: Calculator, href: "/client/calculator" },
    { label: "Packs iTakecare", icon: Shield, href: "/client/itakecare" },
  ];

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  // Handle mobile sidebar
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm shadow-md rounded-full"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5 text-primary" />
          <span className="sr-only">Menu</span>
        </Button>
        
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[250px] border-0 bg-gradient-to-b from-background to-muted/50">
            <div className="flex flex-col h-full">
              <div className="px-4 py-6 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
                    <span className="font-bold text-primary">IT</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">iTakecare</h1>
                    <p className="text-xs text-muted-foreground">Espace Client</p>
                  </div>
                </div>
              </div>
              
              <nav className="flex-1 px-2">
                <ul className="space-y-1.5">
                  {sidebarItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        onClick={() => {
                          onLinkClick?.();
                          setMobileOpen(false);
                        }}
                        className={cn(
                          "flex items-center py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                          isActive(item.href)
                            ? "bg-primary/15 text-primary shadow-sm translate-x-1"
                            : "hover:bg-primary/5 hover:text-primary hover:translate-x-1"
                        )}
                        aria-current={isActive(item.href) ? "page" : undefined}
                      >
                        <item.icon className={cn("mr-3 h-5 w-5", isActive(item.href) && "text-primary")} />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              
              {user && (
                <div className="p-4 mt-auto border-t border-t-muted/40">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground">Client</p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
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
        "h-screen sticky top-0 transition-all duration-300 bg-gradient-to-b from-background to-secondary/10 border-r border-r-primary/10 shadow-md",
        collapsed ? "w-[72px]" : "w-[240px]",
        className
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn(
          "flex items-center gap-2 p-4 mb-4 transition-all duration-300",
          collapsed ? "justify-center" : "px-6"
        )}>
          <div className="w-9 h-9 rounded-md bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-primary">IT</span>
          </div>
          
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold">iTakecare</h1>
              <p className="text-xs text-muted-foreground">Espace Client</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 px-2 py-2">
          <TooltipProvider delayDuration={200}>
            <ul className="space-y-1.5">
              {sidebarItems.map((item) => (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.href}
                        onClick={onLinkClick}
                        className={cn(
                          "flex items-center py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                          collapsed ? "justify-center px-2" : "px-3",
                          isActive(item.href)
                            ? "bg-primary/15 text-primary shadow-sm" 
                            : "hover:bg-primary/5 hover:text-primary"
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
                      <TooltipContent side="right">
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
            "transition-all duration-300 border-t border-t-muted/40",
            collapsed ? "py-4" : "p-4"
          )}>
            {!collapsed ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Client</p>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
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
                      className="w-full h-10 flex justify-center text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
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
        
        <div className="p-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setCollapsed(!collapsed)} 
            className="w-full flex justify-center items-center h-10 rounded-lg"
          >
            <ChevronRight className={cn("h-5 w-5 transition-transform", collapsed ? "rotate-180" : "")} />
            <span className="sr-only">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </span>
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default ClientSidebar;
