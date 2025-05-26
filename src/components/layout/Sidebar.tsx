
import React from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";
import {
  BarChart3,
  Users,
  FileText,
  Settings,
  Package,
  FileSignature,
  Building2,
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const { user, isAdmin, isPartner, isAmbassador, isClient } = useAuth();

  if (!user) return null;

  const getMenuItems = () => {
    if (isClient()) {
      return [
        { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
        { icon: Package, label: "Mon Équipement", href: "/client-equipment" },
        { icon: FileText, label: "Mes Demandes", href: "/client-requests" },
        { icon: FileSignature, label: "Mes Contrats", href: "/client-contracts" },
        { icon: Settings, label: "Paramètres", href: "/client-settings" },
      ];
    }

    if (isPartner()) {
      return [
        { icon: BarChart3, label: "Dashboard", href: "/partner-dashboard" },
        { icon: Users, label: "Mes Clients", href: "/clients" },
        { icon: FileText, label: "Mes Offres", href: "/offers" },
        { icon: Settings, label: "Paramètres", href: "/settings" },
      ];
    }

    if (isAmbassador()) {
      return [
        { icon: BarChart3, label: "Dashboard", href: "/ambassador-dashboard" },
        { icon: Users, label: "Mes Clients", href: "/ambassador-clients" },
        { icon: FileText, label: "Mes Offres", href: "/ambassador-offers" },
        { icon: Package, label: "Catalogue", href: "/ambassador-catalog" },
        { icon: Settings, label: "Paramètres", href: "/settings" },
      ];
    }

    // Admin menu
    return [
      { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
      { icon: Users, label: "Clients", href: "/clients" },
      { icon: Building2, label: "Clients Leazr", href: "/leazr-clients" },
      { icon: FileText, label: "Offres", href: "/offers" },
      { icon: FileSignature, label: "Contrats", href: "/contracts" },
      { icon: Package, label: "Catalogue", href: "/catalog" },
      { icon: Settings, label: "Paramètres", href: "/settings" },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <div className={cn("flex flex-col h-full bg-white border-r border-gray-200", className)}>
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">iTakecare</h1>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <SidebarMenuItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
            />
          ))}
        </ul>
      </nav>

      <SidebarUserSection />
    </div>
  );
};

export default Sidebar;
