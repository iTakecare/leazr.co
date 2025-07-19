
import React from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import CompanyLogo from "@/components/layout/CompanyLogo";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";
import {
  BarChart,
  Users,
  Calculator,
  Package,
  FileText,
  Zap,
} from "lucide-react";

const AmbassadorSidebar = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  if (!user) return null;

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
      label: "Générateur d'offres",
      icon: Zap,
      href: "/ambassador/custom-offer-generator", 
      color: "violet",
    },
    {
      label: "Offres",
      icon: FileText,
      href: "/ambassador/offers",
      color: "indigo",
    },
    {
      label: "Catalogue",
      icon: Package,
      href: "/ambassador/catalog",
      color: "pink",
    },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="fixed inset-y-0 left-0 z-20 hidden h-full w-64 flex-col border-r border-gray-100 bg-white md:flex">
      <div className="flex h-16 items-center justify-center border-b border-gray-100 px-6 bg-gradient-to-r from-gray-50 to-white">
        <CompanyLogo showText={false} logoSize="sm" />
      </div>
      
      <div className="flex-1 px-4 py-6">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <SidebarMenuItem
              key={item.href}
              item={item}
              isActive={isActive}
              collapsed={false}
            />
          ))}
        </nav>
      </div>
      
      <SidebarUserSection />
    </div>
  );
};

export default AmbassadorSidebar;
