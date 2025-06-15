
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Users, 
  FileText, 
  Settings, 
  Package, 
  UserPlus,
  Building2,
  CreditCard,
  MessageSquare,
  Database,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarUserSection from "./SidebarUserSection";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navigationItems = [
    { 
      label: "Dashboard", 
      path: "/dashboard", 
      icon: Home 
    },
    { 
      label: "Clients", 
      path: "/admin/clients", 
      icon: Users 
    },
    { 
      label: "Offres", 
      path: "/admin/offers", 
      icon: FileText 
    },
    { 
      label: "Contrats", 
      path: "/admin/contracts", 
      icon: CreditCard 
    },
    { 
      label: "Catalogue", 
      path: "/admin/catalog", 
      icon: Package 
    },
    { 
      label: "Ambassadeurs", 
      path: "/ambassadors", 
      icon: UserPlus 
    },
    { 
      label: "Partenaires", 
      path: "/admin/partners", 
      icon: Building2 
    },
    {
      label: "CRM",
      path: "/crm",
      icon: MessageSquare
    }
  ];

  const adminItems = [
    {
      label: "Paramètres",
      path: "/admin/settings",
      icon: Settings
    },
    {
      label: "Analyse Multi-Tenant",
      path: "/admin/multi-tenant-analysis",
      icon: Database
    },
    {
      label: "Paramètres Entreprise",
      path: "/company/settings",
      icon: Building2
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">Admin</span>
        </Link>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => (
          <SidebarMenuItem
            key={item.path}
            label={item.label}
            path={item.path}
            icon={item.icon}
            isActive={isActive(item.path)}
          />
        ))}
        
        <Separator className="my-4" />
        
        <div className="space-y-2">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Administration
          </div>
          {adminItems.map((item) => (
            <SidebarMenuItem
              key={item.path}
              label={item.label}
              path={item.path}
              icon={item.icon}
              isActive={isActive(item.path)}
            />
          ))}
        </div>
      </nav>
      
      <SidebarUserSection />
    </div>
  );
};

export default Sidebar;
