
import React, { useState, memo } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import CompanyLogo from "@/components/layout/CompanyLogo";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Users,
  Calculator,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const AmbassadorSidebar = memo(() => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { companyId } = useMultiTenant();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user) return null;

  const companyName = "Leazr";

  const menuItems = [
    {
      label: "Tableau de bord",
      icon: BarChart,
      href: "/ambassador/dashboard",
      color: "blue",
    },
    {
      label: "Mes Clients", 
      icon: Users,
      href: "/ambassador/clients",
      color: "emerald",
    },
    {
      label: "Calculateur",
      icon: Calculator,
      href: "/ambassador/create-offer",
      color: "orange",
    },
    {
      label: "Offres",
      icon: FileText,
      href: "/ambassador/offers",
      color: "indigo",
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
        "bg-white/95 backdrop-blur-xl border-r border-gray-200/60 shadow-xl",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex h-16 items-center border-b border-gray-200/60 transition-all duration-300",
        "bg-gradient-to-r from-blue-50/80 to-purple-50/80",
        isCollapsed ? "justify-center px-2" : "justify-between px-6"
      )}>
        {isCollapsed ? (
          <CompanyLogo showText={false} logoSize="sm" />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <CompanyLogo showText={false} logoSize="sm" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 leading-tight">
                  {companyName}
                </span>
                <span className="text-xs text-gray-500 leading-tight">
                  Ambassadeur
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-8 w-8 p-0 hover:bg-white/60"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      
      {/* Navigation */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        isCollapsed ? "px-2 py-4" : "px-4 py-6"
      )}>
        <nav>
          <ul className="space-y-2 list-none">
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
        <div className="p-2 border-t border-gray-200/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="w-full h-8 p-0 hover:bg-gray-100/60"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* User Section */}
      <SidebarUserSection collapsed={isCollapsed} />
    </div>
  );
});

export default AmbassadorSidebar;
