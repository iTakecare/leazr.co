
import React from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import Logo from "./Logo";

interface MobileSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  menuItems: Array<{
    label: string;
    icon: React.ElementType;
    href: string;
  }>;
  isActive: (href: string) => boolean;
  onLinkClick?: () => void;
  avatarUrl: string | null;
  getUserInitials: () => string;
  getUserDisplayName: () => string;
  getUserRole: () => string;
  handleLogout: () => void;
}

const MobileSidebar = ({
  mobileOpen,
  setMobileOpen,
  menuItems,
  isActive,
  onLinkClick,
  avatarUrl,
  getUserInitials,
  getUserDisplayName,
  getUserRole,
  handleLogout
}: MobileSidebarProps) => {
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
                      className={`flex items-center py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive(item.href)
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-y-[-2px]"
                          : "hover:bg-primary/10 hover:text-primary hover:translate-y-[-2px]"
                      }`}
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      <item.icon className={`mr-3 h-5 w-5 ${isActive(item.href) && "stroke-[2.5px]"}`} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            
            <div className="p-4 mt-auto border-t">
              <div className="flex items-center gap-3 mb-4">
                <Avatar>
                  <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
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
};

export default MobileSidebar;
