
import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";

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
  const handleMenuItemClick = () => {
    setMobileOpen(false);
    if (onLinkClick) onLinkClick();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px] md:hidden">
          <div className="flex flex-col h-full">
            <div className="flex items-center p-4 mb-2 justify-start">
              <Logo showText={false} logoSize="lg" className="scale-[2.5]" />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setMobileOpen(false)} 
                className="rounded-full hover:bg-primary/10 ml-auto"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="flex-1 px-2 py-4">
              <ul className="space-y-1">
                {menuItems.map((item) => (
                  <SidebarMenuItem 
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    collapsed={false}
                    onLinkClick={handleMenuItemClick}
                  />
                ))}
              </ul>
            </nav>
            
            <SidebarUserSection
              collapsed={false}
              avatarUrl={avatarUrl}
              getUserInitials={getUserInitials}
              getUserDisplayName={getUserDisplayName}
              getUserRole={getUserRole}
              handleLogout={handleLogout}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MobileSidebar;
