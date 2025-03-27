
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Users, Package, Settings, 
  Calculator, ShieldCheck, Menu, ChevronRight, ChevronLeft,
  X, Receipt, FileText, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Logo from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";
import MobileSidebar from "./MobileSidebar";

interface MenuItem {
  label: string;
  icon: React.ElementType | (() => React.ReactNode);
  href: string;
}

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
  menuItems: MenuItem[];
  isActive: (href: string) => boolean;
  avatarUrl?: string | null;
  getUserInitials: () => string;
  getUserDisplayName: () => string;
  getUserRole: () => string;
  handleLogout: () => void;
}

const Sidebar = ({ 
  className, 
  onLinkClick,
  menuItems,
  isActive,
  avatarUrl,
  getUserInitials,
  getUserDisplayName,
  getUserRole,
  handleLogout
}: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  
  if (isMobile) {
    return null;
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
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <SidebarMenuItem 
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
                onLinkClick={onLinkClick}
              />
            ))}
          </ul>
        </nav>
        
        <SidebarUserSection
          collapsed={collapsed}
          avatarUrl={avatarUrl}
          getUserInitials={getUserInitials}
          getUserDisplayName={getUserDisplayName}
          getUserRole={getUserRole}
          handleLogout={handleLogout}
        />
        
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
