import React, { useState, memo, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useLocation } from "react-router-dom";
import { 
  BarChart3, 
  FileText, 
  Settings, 
  Menu, 
  X,
  ChevronRight,
  UserCheck,
  ClipboardList,
  Calculator,
  Package,
  Mail
} from "lucide-react";
import SidebarIcon from "./SidebarIcon";
import SidebarUserSection from "./SidebarUserSection";
import SidebarMenuItem from "./SidebarMenuItem";
import { AdminNotificationBadge } from "@/components/admin/AdminNotificationBadge";

interface SidebarProps {
  className?: string;
}

const Sidebar = memo(({ className }: SidebarProps) => {
  const { user } = useAuth();
  const { companyId } = useMultiTenant();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const { hasModuleAccess } = useModuleAccess();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getCompanySlugFromPath = () => {
    const pathMatch = location.pathname.match(/^\/([^\/]+)\/(admin|client|ambassador)/);
    return pathMatch?.[1] || null;
  };

  const companySlug = getCompanySlugFromPath();

  const menuItems = useMemo(() => {
    const basePrefix = companySlug ? `/${companySlug}` : '';
    
    const allMenuItems = [
      { 
        icon: BarChart3, 
        label: "Dashboard", 
        href: `${basePrefix}/admin/dashboard`, 
        moduleSlug: "dashboard",
        alwaysVisible: true 
      },
      { 
        icon: UserCheck, 
        label: "CRM", 
        href: `${basePrefix}/admin/clients`, 
        moduleSlug: "crm" 
      },
      { 
        icon: FileText, 
        label: "Contrats", 
        href: `${basePrefix}/admin/contracts`, 
        moduleSlug: "contracts" 
      },
      { 
        icon: ClipboardList, 
        label: "Demandes", 
        href: `${basePrefix}/admin/offers`, 
        moduleSlug: "offers" 
      },
      { 
        icon: Calculator, 
        label: "Factures", 
        href: `${basePrefix}/admin/invoicing`, 
        moduleSlug: "invoicing" 
      },
      { 
        icon: Package, 
        label: "Catalogue", 
        href: `${basePrefix}/admin/catalog`, 
        moduleSlug: "catalog" 
      },
      { 
        icon: Mail, 
        label: "Chat Admin", 
        href: `${basePrefix}/admin/chat`, 
        moduleSlug: "chat" 
      },
      { 
        icon: Settings, 
        label: "Paramètres", 
        href: `${basePrefix}/admin/settings`, 
        moduleSlug: "settings",
        alwaysVisible: true 
      },
    ];

    return allMenuItems.filter(item => {
      if (item.alwaysVisible) return true;
      return hasModuleAccess(item.moduleSlug);
    });
  }, [companySlug, hasModuleAccess]);

  const isActive = useCallback((href: string) => location.pathname === href, [location.pathname]);
  const toggleCollapsed = useCallback(() => setIsCollapsed(prev => !prev), []);
  const toggleMobile = useCallback(() => setIsMobileOpen(prev => !prev), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);
  const companyName = useMemo(() => settings?.company_name || "Leazr", [settings?.company_name]);

  if (!user || !companyId) return null;

  const SidebarContent = memo(() => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className={cn(
        "border-b border-sidebar-border",
        isCollapsed ? "p-3" : "p-4"
      )}>
        {isCollapsed ? (
          <div className="flex flex-col items-center">
            <SidebarIcon size="md" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarIcon size="md" />
              <div className="min-w-0 flex-1">
                {!settingsLoading && (
                  <>
                    <h1 className="text-sm font-semibold text-white truncate">{companyName}</h1>
                    <p className="text-xs text-sidebar-foreground/60">Administration</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AdminNotificationBadge />
              <button
                onClick={toggleCollapsed}
                className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-sidebar-foreground/70 rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 overflow-y-auto",
        isCollapsed ? "px-2 py-3" : "p-3"
      )}>
        {!isCollapsed && (
          <p className="text-[10px] font-semibold uppercase text-sidebar-foreground/40 px-3 mb-2">
            Navigation
          </p>
        )}
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <SidebarMenuItem
              key={item.href}
              item={item}
              isActive={isActive}
              collapsed={isCollapsed}
              onLinkClick={closeMobile}
            />
          ))}
        </ul>
      </nav>

      {/* Collapse button when collapsed */}
      {isCollapsed && (
        <div className="p-2 border-t border-sidebar-border">
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex w-full justify-center p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-sidebar-foreground/70" />
          </button>
        </div>
      )}

      {/* User Section */}
      <div className="border-t border-sidebar-border">
        <SidebarUserSection collapsed={isCollapsed} darkMode />
      </div>
    </div>
  ));

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-card rounded-xl shadow-lg border border-border hover:bg-accent transition-colors"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
        className
      )}>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={closeMobile}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 transform transition-transform duration-300">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
