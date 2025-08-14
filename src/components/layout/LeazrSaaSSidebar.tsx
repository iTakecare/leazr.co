
import React from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";
import { useLocation } from "react-router-dom";
import {
  BarChart3,
  Zap,
  Settings,
  LifeBuoy,
  Globe,
} from "lucide-react";

interface LeazrSaaSSidebarProps {
  className?: string;
}

const LeazrSaaSSidebar = ({ className }: LeazrSaaSSidebarProps) => {
  const { user, isSuperAdmin } = useAuth();
  const location = useLocation();

  // Vérifier si l'utilisateur est super admin
  const isLeazrSaaSAdmin = isSuperAdmin();

  if (!user || !isLeazrSaaSAdmin) return null;

  const menuItems = [
    { icon: BarChart3, label: "Dashboard SaaS", href: "/admin/leazr-saas-dashboard", color: "blue" },
    { icon: Zap, label: "Gestion Applications", href: "/admin/leazr-saas-clients", color: "orange" },
    { icon: Globe, label: "Gestion Domaines", href: "/admin/leazr-saas-domains", color: "indigo" },
    { icon: Settings, label: "Configuration", href: "/admin/leazr-saas-settings", color: "gray" },
    { icon: LifeBuoy, label: "Support", href: "/admin/leazr-saas-support", color: "pink" },
  ];

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  return (
    <div className={cn("flex flex-col h-full bg-white border-r border-gray-200", className)}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Leazr SaaS</h1>
            <p className="text-xs text-gray-500">Administration simplifiée</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((menuItem) => (
            <SidebarMenuItem
              key={menuItem.href}
              item={menuItem}
              isActive={isActive}
              collapsed={false}
            />
          ))}
        </ul>
      </nav>

      <SidebarUserSection />
    </div>
  );
};

export default LeazrSaaSSidebar;
