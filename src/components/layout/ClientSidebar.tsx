
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  FileText, 
  Laptop, 
  Inbox,
  Search,
  MessageSquare,
  Settings,
  LogOut
} from "lucide-react";

const ClientSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Get user information
  const userEmail = user?.email || '';
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';
  const displayName = firstName && lastName 
    ? `${firstName} ${lastName}` 
    : userEmail.split('@')[0];

  // Navigation items
  const navigationItems = [
    {
      name: "Tableau de bord",
      href: "/client/dashboard",
      icon: LayoutDashboard,
      active: location.pathname === "/client/dashboard",
    },
    {
      name: "Contrats",
      href: "/client/contracts",
      icon: FileText,
      active: location.pathname === "/client/contracts",
    },
    {
      name: "Équipements",
      href: "/client/equipment",
      icon: Laptop,
      active: location.pathname === "/client/equipment" || location.pathname.startsWith("/client/equipment/"),
    },
    {
      name: "Demandes",
      href: "/client/requests",
      icon: Inbox,
      active: location.pathname === "/client/requests",
    },
    {
      name: "Catalogue",
      href: "/client/catalog",
      icon: Search,
      active: location.pathname === "/client/catalog",
    },
    {
      name: "Support",
      href: "/client/support",
      icon: MessageSquare,
      active: location.pathname === "/client/support",
    },
    {
      name: "Paramètres",
      href: "/client/settings",
      icon: Settings,
      active: location.pathname === "/client/settings",
    },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  return (
    <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 z-[80] bg-white border-r">
      <div className="flex flex-col h-full">
        {/* Logo and branding */}
        <div className="flex items-center flex-shrink-0 px-5 py-6 border-b">
          <Link to="/client/dashboard" className="flex items-center gap-2">
            <img
              className="h-8 w-auto"
              src="/logo.svg"
              alt="iTakecare"
            />
            <span className="text-xl font-bold">iTakecare</span>
          </Link>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-gray-500">Client</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="mt-3 w-full flex items-center justify-center gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 overflow-y-auto">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md group transition-colors ${
                  item.active
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    item.active 
                      ? "text-blue-600" 
                      : "text-gray-400 group-hover:text-gray-500"
                  }`}
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default ClientSidebar;
