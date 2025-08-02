import React, { useState, memo, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useLocation } from "react-router-dom";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { 
  LayoutDashboard,
  FileText,
  Laptop,
  Clock,
  Package,
  Menu, 
  X,
  ChevronRight,
  Settings,
  HelpCircle
} from "lucide-react";
import CompanyLogo from "./CompanyLogo";
import SidebarUserSection from "./SidebarUserSection";
import SidebarMenuItem from "./SidebarMenuItem";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

const ClientSidebar = memo(({ className, onLinkClick }: SidebarProps) => {
  const { user } = useAuth();
  const { companyId } = useMultiTenant();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const location = useLocation();
  const { navigateToClient, companySlug } = useRoleNavigation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Mémoriser les éléments de menu
  const menuItems = useMemo(() => [
    { icon: LayoutDashboard, label: "Tableau de bord", href: "dashboard", color: "blue" },
    { icon: Laptop, label: "Équipements", href: "equipment", color: "slate" },
    { icon: FileText, label: "Contrats", href: "contracts", color: "emerald" },
    { icon: Clock, label: "Demandes en cours", href: "requests", color: "orange", badge: "3" },
    { icon: Package, label: "Catalogue", href: "products", color: "violet" },
    { icon: HelpCircle, label: "Support", href: "support", color: "pink" },
    { icon: Settings, label: "Paramètres", href: "settings", color: "gray" },
  ], []);

  // Mémoriser la fonction isActive
  const isActive = useCallback((href: string) => {
    if (!companySlug) return false;
    const fullPath = `/${companySlug}/client/${href}`;
    return location.pathname === fullPath;
  }, [location.pathname, companySlug]);

  // Mémoriser les handlers
  const toggleCollapsed = useCallback(() => setIsCollapsed(prev => !prev), []);
  const toggleMobile = useCallback(() => setIsMobileOpen(prev => !prev), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  // Mémoriser le handler de navigation
  const handleNavigation = useCallback((href: string) => {
    console.log("🚀 CLIENT SIDEBAR - Navigation vers:", href, "depuis:", location.pathname);
    navigateToClient(href);
    onLinkClick?.();
    closeMobile();
  }, [navigateToClient, onLinkClick, closeMobile, location.pathname]);

  // Mémoriser le nom de l'entreprise
  const companyName = useMemo(() => settings?.company_name || "Leazr", [settings?.company_name]);

  if (!user || !companyId) return null;

  const SidebarContent = memo(() => (
    <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl border-r border-gray-200/60 shadow-xl">
      {/* Header avec logo - layout adapté pour collapsed */}
      <div className={cn(
        "border-b border-gray-200/60 bg-gradient-to-r from-blue-50/80 to-purple-50/80",
        isCollapsed ? "p-2" : "p-4"
      )}>
        {isCollapsed ? (
          // Mode collapsed : logo + nom de l'entreprise en compact
          <div className="flex flex-col items-start gap-1">
            <CompanyLogo 
              logoSize="sm"
              className="transition-all duration-300 w-8 h-8"
            />
            {!settingsLoading && companyName && (
              <div className="text-left">
                <p className="text-xs font-bold text-gray-900 truncate max-w-12 leading-tight">
                  {companyName}
                </p>
              </div>
            )}
          </div>
        ) : (
          // Mode étendu : layout complet avec logo d'entreprise
          <div className="flex items-center gap-3">
            <CompanyLogo 
              logoSize="sm"
              className="transition-all duration-300"
            />
            <div className="min-w-0 flex-1">
              {!settingsLoading && (
                <>
                  <h1 className="text-lg font-bold text-gray-900 truncate">{companyName}</h1>
                  <p className="text-xs text-gray-600 truncate font-medium">Espace Client</p>
                </>
              )}
            </div>
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex p-1.5 bg-white/80 border border-gray-200/60 rounded-lg shadow-sm hover:shadow-md hover:bg-white transition-all duration-200"
            >
              <ChevronRight className="h-4 w-4 text-gray-600 transition-transform duration-200 rotate-180" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation avec espacement adapté */}
      <nav className={cn(
        "flex-1 overflow-y-auto",
        isCollapsed ? "px-1 py-2" : "p-4"
      )}>
        <ul className={cn("space-y-1", isCollapsed ? "" : "space-y-2")}>
          {menuItems.map((item) => (
            <SidebarMenuItem
              key={item.href}
              item={item}
              isActive={(href) => isActive(href)}
              collapsed={isCollapsed}
              onLinkClick={() => handleNavigation(item.href)}
            />
          ))}
        </ul>
      </nav>

      {/* Bouton de collapse en bas en mode collapsed */}
      {isCollapsed && (
        <div className="p-2 border-t border-gray-200/60">
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex w-full justify-center p-2 bg-white/80 border border-gray-200/60 rounded-lg shadow-sm hover:shadow-md hover:bg-white transition-all duration-200"
          >
            <ChevronRight className="h-4 w-4 text-gray-600 transition-transform duration-200" />
          </button>
        </div>
      )}

      {/* User Section avec meilleur contraste */}
      <div className="border-t border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-blue-50/80">
        <SidebarUserSection collapsed={isCollapsed} />
      </div>
    </div>
  ));

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/60 hover:bg-gray-50 transition-all duration-200"
      >
        {isMobileOpen ? <X className="h-5 w-5 text-gray-700" /> : <Menu className="h-5 w-5 text-gray-700" />}
      </button>

      {/* Desktop Sidebar avec largeurs fixes */}
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
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
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

ClientSidebar.displayName = 'ClientSidebar';

export default ClientSidebar;