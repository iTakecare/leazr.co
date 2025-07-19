import React, { useState, memo, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useLocation } from "react-router-dom";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Calendar, 
  CreditCard, 
  Settings, 
  Menu, 
  X,
  ChevronRight,
  Building2,
  UserCheck,
  ClipboardList,
  Calculator,
  Package,
  TrendingUp,
  HelpCircle,
  Mail
} from "lucide-react";
import CompanyLogo from "./CompanyLogo";
import SidebarUserSection from "./SidebarUserSection";
import SidebarMenuItem from "./SidebarMenuItem";

interface SidebarProps {
  className?: string;
}

const Sidebar = memo(({ className }: SidebarProps) => {
  const { user } = useAuth();
  const { companyId } = useMultiTenant();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Mémoriser les éléments de menu pour éviter les re-renders
  const menuItems = useMemo(() => [
    { icon: BarChart3, label: "Dashboard", href: "/admin/dashboard", color: "text-blue-600" },
    { icon: UserCheck, label: "CRM", href: "/admin/clients", color: "text-orange-600" },
    { icon: FileText, label: "Contrats", href: "/admin/contracts", color: "text-red-600" },
    { icon: ClipboardList, label: "Devis", href: "/admin/offers", color: "text-indigo-600" },
    { icon: Calculator, label: "Factures", href: "/admin/invoicing", color: "text-pink-600" },
    { icon: Package, label: "Catalogue", href: "/admin/catalog", color: "text-emerald-600" },
    { icon: Mail, label: "Chat Admin", href: "/admin/chat", color: "text-violet-600" },
    { icon: Settings, label: "Paramètres", href: "/admin/settings", color: "text-gray-600" },
  ], []);

  // Mémoriser la fonction isActive
  const isActive = useCallback((href: string) => location.pathname === href, [location.pathname]);

  // Mémoriser les handlers
  const toggleCollapsed = useCallback(() => setIsCollapsed(prev => !prev), []);
  const toggleMobile = useCallback(() => setIsMobileOpen(prev => !prev), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  // Mémoriser le nom de l'entreprise
  const companyName = useMemo(() => settings?.company_name || "Leazr", [settings?.company_name]);

  if (!user || !companyId) return null;

  const SidebarContent = memo(() => (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-xl">
      {/* Header avec logo */}
      <div className={cn(
        "p-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50",
        isCollapsed ? "px-2" : "px-4"
      )}>
        <div className={cn(
          "flex flex-col gap-1",
          isCollapsed ? "items-center" : "items-start"
        )}>
          <CompanyLogo 
            logoSize={isCollapsed ? "sm" : "md"}
            className={isCollapsed ? "mx-auto" : ""}
          />
          {!isCollapsed && !settingsLoading && (
            <div className="text-left">
              <h1 className="text-lg font-bold text-gray-900">{companyName}</h1>
              <p className="text-xs text-gray-500">Administration</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
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

      {/* User Section */}
      <div className="border-t border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-blue-50/50">
        <SidebarUserSection />
      </div>
    </div>
  ));

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/50"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
        className
      )}>
        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapsed}
          className="absolute -right-3 top-8 z-10 p-1.5 bg-white border border-gray-200 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
        >
          <ChevronRight className={cn(
            "h-4 w-4 text-gray-600 transition-transform duration-200",
            isCollapsed ? "rotate-0" : "rotate-180"
          )} />
        </button>
        
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
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
