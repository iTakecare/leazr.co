
import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, LogOut, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Logo from "./Logo";

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

interface MobileSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  menuItems: MenuItem[];
  isActive: (href: string) => boolean;
  onLinkClick?: () => void;
  avatarUrl: string | null;
  getUserInitials: () => string;
  getUserDisplayName: () => string;
  getUserRole: () => string;
  handleLogout: () => Promise<void>;
  pendingRequests: number;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  mobileOpen,
  setMobileOpen,
  menuItems,
  isActive,
  onLinkClick,
  avatarUrl,
  getUserInitials,
  getUserDisplayName,
  getUserRole,
  handleLogout,
  pendingRequests
}) => {
  return (
    <>
      {/* Overlay pour fermer la sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar mobile */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-[280px] z-50 transition-transform duration-300 bg-white shadow-xl overflow-y-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <Logo showText />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{getUserDisplayName()}</p>
                <p className="text-xs text-muted-foreground">{getUserRole()}</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 py-4">
            <ul className="space-y-1 px-2">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center py-2 px-3 rounded-lg text-sm transition-colors",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                    )}
                    onClick={() => {
                      setMobileOpen(false);
                      onLinkClick?.();
                    }}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
              
              {/* Élément de menu pour les demandes client */}
              <li>
                <Link
                  to="/client/requests"
                  className={cn(
                    "flex items-center py-2 px-3 rounded-lg text-sm transition-colors",
                    isActive("/client/requests")
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                  )}
                  onClick={() => {
                    setMobileOpen(false);
                    onLinkClick?.();
                  }}
                >
                  <span className="relative mr-3">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <line x1="10" y1="9" x2="8" y2="9"/>
                    </svg>
                    {pendingRequests > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {pendingRequests}
                      </span>
                    )}
                  </span>
                  <span>Demandes</span>
                  {pendingRequests > 0 && (
                    <Badge className="ml-auto bg-red-500 text-white px-1.5">
                      {pendingRequests}
                    </Badge>
                  )}
                </Link>
              </li>
            </ul>
          </nav>
          
          <div className="p-4 space-y-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full flex items-center gap-2 text-primary border-primary/20 hover:bg-primary/10 hover:shadow"
              asChild
            >
              <Link to="/" onClick={() => setMobileOpen(false)}>
                <ExternalLink className="h-4 w-4" />
                Aller sur le site
              </Link>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full flex items-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={() => {
                handleLogout();
                setMobileOpen(false);
              }}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;
