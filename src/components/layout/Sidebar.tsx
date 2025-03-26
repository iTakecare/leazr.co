import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const Sidebar = ({ className, onLinkClick }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const menuItems: MenuItem[] = [
    { href: "/", label: "Tableau de bord", icon: require('lucide-react').LayoutDashboard },
    { href: "/clients", label: "Clients", icon: require('lucide-react').Users },
    { href: "/catalog", label: "Catalogue", icon: require('lucide-react').ListProducts },
    { href: "/offers", label: "Offres", icon: require('lucide-react').Percent },
    { href: "/contracts", label: "Contrats", icon: require('lucide-react').FileSignature },
    { href: "/i-take-care", label: "iTakecare", icon: require('lucide-react').HeartHandshake },
    { href: "/settings", label: "Paramètres", icon: require('lucide-react').Settings },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (href: string) => {
    return window.location.pathname === href;
  };

  // Fonction d'affichage mobile
  if (isMobile) {
    return (
      <>
        <Button 
          variant="ghost" 
          size="icon" 
          className="fixed left-4 top-4 z-50"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </>
    );
  }

  // Composant sidebar pour desktop
  return (
    <>
      {isMobile && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="fixed left-4 top-4 z-50"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      )}
      
      <div 
        className={cn(
          "flex h-screen w-[250px] flex-col overflow-hidden bg-background border-r transition-all duration-300",
          collapsed && "w-[80px]",
          className
        )}
        data-collapsed={collapsed}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link to="/" className="flex items-center gap-2">
            {!collapsed && (
              <>
                <img src="/site-favicon.ico" alt="Logo" className="h-8 w-8" />
                <span className="font-semibold text-lg">iTakecare</span>
              </>
            )}
            {collapsed && <img src="/site-favicon.ico" alt="Logo" className="h-8 w-8" />}
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="flex flex-col gap-1 px-2">
            {menuItems.map((item) => (
              <TooltipProvider key={item.href} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(item.href) 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      onClick={() => onLinkClick?.()}
                    >
                      <item.icon className={cn("h-5 w-5", collapsed ? "mx-auto" : "")} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar_url || ''} />
              <AvatarFallback>
                {user?.first_name?.[0] || ''}{user?.last_name?.[0] || ''}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.first_name} {user?.last_name}</span>
                <span className="text-xs text-muted-foreground">{user?.title || "Admin Portal"}</span>
              </div>
            )}
            {!collapsed && (
              <Button variant="ghost" size="icon" className="ml-auto" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
