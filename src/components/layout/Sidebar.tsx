
import React from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  Calculator,
  Shield,
  Menu,
  ChevronRight
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
                    <p className="text-xs text-muted-foreground">Hub de gestion</p>
                  </div>
                </div>
              </div>
              
              <nav className="flex-1 px-2">
                <ul className="space-y-1.5">
                  {menuItems.map((item) => (
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
              <p className="text-xs text-muted-foreground">Hub de gestion</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 px-2 py-2">
          <TooltipProvider delayDuration={200}>
            <ul className="space-y-1.5">
              {menuItems.map((item) => (
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
        
        <div className="p-2 mt-auto">
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

export default Sidebar;
