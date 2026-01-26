
import React, { useState, memo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useCompanyContext } from "@/context/CompanyContext";
import CompanyLogo from "@/components/layout/CompanyLogo";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Users,
  Calculator,
  Package,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const AmbassadorSidebar = memo(() => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { company } = useCompanyContext();
  const { companySlug } = useParams<{ companySlug: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user || !companySlug) return null;

  const companyName = company?.name || "Entreprise";

  const menuItems = [
    {
      label: "Tableau de bord",
      icon: BarChart,
      href: `/${companySlug}/ambassador/dashboard`,
    },
    {
      label: "Mes Clients", 
      icon: Users,
      href: `/${companySlug}/ambassador/clients`,
    },
    {
      label: "Calculateur",
      icon: Calculator,
      href: `/${companySlug}/ambassador/create-offer`,
    },
    {
      label: "Demandes",
      icon: FileText,
      href: `/${companySlug}/ambassador/offers`,
    },
    {
      label: "Catalogue",
      icon: Package,
      href: `/${companySlug}/ambassador/catalog`,
    },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div 
      className={cn(
        "fixed inset-y-0 left-0 z-20 hidden h-full flex-col transition-all duration-300 md:flex",
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center border-b border-sidebar-border transition-all duration-300",
        isCollapsed ? "justify-center p-3" : "justify-between p-4"
      )}>
        {isCollapsed ? (
          <CompanyLogo showText={false} logoSize="sm" className="w-8 h-8" />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <CompanyLogo showText={false} logoSize="sm" className="w-8 h-8" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white leading-tight">
                  {companyName}
                </span>
                <span className="text-xs text-sidebar-foreground/60 leading-tight">
                  Ambassadeur
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-8 w-8 p-0 hover:bg-white/10 text-sidebar-foreground/70"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      
      {/* Navigation */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        isCollapsed ? "px-2 py-3" : "p-3"
      )}>
        {!isCollapsed && (
          <p className="text-[10px] font-semibold uppercase text-sidebar-foreground/40 px-3 mb-2">
            Navigation
          </p>
        )}
        <nav>
          <ul className="space-y-1 list-none">
            {menuItems.map((item) => (
              <SidebarMenuItem
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={isCollapsed}
              />
            ))}
          </ul>
        </nav>
      </div>

      {/* Collapse button (when collapsed) */}
      {isCollapsed && (
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="w-full h-8 p-0 hover:bg-white/10 text-sidebar-foreground/70"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* User Section */}
      <div className="border-t border-sidebar-border">
        <SidebarUserSection collapsed={isCollapsed} darkMode />
      </div>
    </div>
  );
});

export default AmbassadorSidebar;
