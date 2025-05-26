
import React from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";
import { useLocation } from "react-router-dom";
import {
  Users,
  Settings,
} from "lucide-react";

interface LeazrAdminSidebarProps {
  className?: string;
}

const LeazrAdminSidebar = ({ className }: LeazrAdminSidebarProps) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const menuItems = [
    { icon: Users, label: "Clients Leazr", href: "/leazr-clients" },
    { icon: Settings, label: "Paramètres", href: "/settings" },
  ];

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  return (
    <div className={cn("flex flex-col h-full bg-white border-r border-gray-200", className)}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Leazr Admin</h1>
            <p className="text-xs text-gray-500">Gestion des comptes</p>
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

export default LeazrAdminSidebar;
