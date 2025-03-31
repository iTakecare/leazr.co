
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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ClientSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  // Get user information
  const userEmail = user?.email || '';
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (userEmail) {
      return userEmail.substring(0, 2).toUpperCase();
    }
    return "CL";
  };

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
    <div className="hidden md:flex h-screen bg-white border-r w-16 flex-col justify-between fixed z-30">
      {/* Logo */}
      <div className="flex flex-col items-center">
        <div className="h-16 w-16 flex items-center justify-center border-b">
          <Link to="/client/dashboard">
            <img src="/logo.svg" alt="iTakecare" className="h-8 w-8" />
          </Link>
        </div>
        
        {/* Navigation items */}
        <nav className="mt-6 flex flex-col items-center gap-4">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
                item.active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-gray-500 hover:text-primary hover:bg-primary/10"
              )}
              title={item.name}
            >
              <item.icon className={cn("h-5 w-5", item.active && "stroke-[2px]")} />
            </Link>
          ))}
        </nav>
      </div>
      
      {/* User section */}
      <div className="flex flex-col items-center pb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-500 hover:bg-red-50"
          title="Déconnexion"
        >
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Déconnexion</span>
        </Button>
        
        <Avatar className="h-8 w-8 mt-4">
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
};

export default ClientSidebar;
