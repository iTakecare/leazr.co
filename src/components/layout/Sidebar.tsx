
import React from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  Calculator,
  Shield,
  Menu,
  ChevronRight,
  ChevronLeft,
  X
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
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  
  const menuItems: MenuItem[] = [
    { label: "Tableau de bord", icon: LayoutDashboard, href: "/" },
    { label: "Clients", icon: Users, href: "/clients" },
    { label: "Offres", icon: FileText, href: "/offers" },
    { label: "Contrats", icon: FileText, href: "/contracts" },
    { label: "Catalogue", icon: Package, href: "/catalog" },
    { label: "iTakecare", icon: Shield, href: "/i-take-care" },
    { label: "Calculateur", icon: Calculator, href: "/calculator" },
    { label: "Paramètres", icon: Settings, href: "/settings" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location.pathname === "/") {
      return true;
    }
    return location.pathname.startsWith(href) && href !== "/";
  };

  // Handle mobile sidebar
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
                <div className="flex items-center gap-2">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 bg-primary/20 rounded-xl rotate-6"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl -rotate-6"></div>
                    <div className="absolute inset-0 flex items-center justify-center bg-background rounded-xl shadow-md">
                      <span className="font-bold text-primary text-lg">IT</span>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">iTakecare</h1>
                    <p className="text-xs text-muted-foreground">Hub de gestion</p>
                  </div>
                </div>
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
              
              <div className="p-4 mt-auto mx-2 mb-2 bg-primary/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/20 text-primary">IT</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">Admin Portal</p>
                    <p className="text-xs text-muted-foreground">Gestion complète</p>
                  </div>
                </div>
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
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 flex-shrink-0">
              <div className="absolute inset-0 bg-primary/20 rounded-xl rotate-6"></div>
              <div className="absolute inset-0 bg-primary/10 rounded-xl -rotate-6"></div>
              <div className="absolute inset-0 flex items-center justify-center bg-background rounded-xl shadow-md">
                <span className="font-bold text-primary text-lg">IT</span>
              </div>
            </div>
            
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-lg font-bold">iTakecare</h1>
                <p className="text-xs text-muted-foreground">Hub de gestion</p>
              </div>
            )}
          </div>
          
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
          "p-4 transition-all duration-300 mt-auto mx-2 mb-2",
          collapsed ? "bg-transparent" : "bg-primary/5 rounded-xl"
        )}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary/20 text-primary">IT</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">Admin Portal</p>
                <p className="text-xs text-muted-foreground">Gestion complète</p>
              </div>
            </div>
          ) : (
            <Avatar className="mx-auto">
              <AvatarFallback className="bg-primary/20 text-primary">IT</AvatarFallback>
            </Avatar>
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
