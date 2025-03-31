
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import SidebarUserSection from "./SidebarUserSection";
import { 
  LayoutDashboard, 
  FileText, 
  Laptop, 
  Inbox,
  MessageSquare,
  Settings,
  Search
} from "lucide-react";

const ClientSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Navigation items for client sidebar
  const navigationItems = [
    {
      name: "Tableau de bord",
      href: "/client/dashboard",
      icon: LayoutDashboard,
      current: location.pathname === "/client/dashboard",
    },
    {
      name: "Contrats",
      href: "/client/contracts",
      icon: FileText,
      current: location.pathname === "/client/contracts",
    },
    {
      name: "Équipements",
      href: "/client/equipment",
      icon: Laptop,
      current: location.pathname === "/client/equipment",
    },
    {
      name: "Demandes",
      href: "/client/requests",
      icon: Inbox,
      current: location.pathname === "/client/requests",
    },
    {
      name: "Catalogue",
      href: "/client/catalog",
      icon: Search,
      current: location.pathname === "/client/catalog",
    },
    {
      name: "Support",
      href: "/client/support",
      icon: MessageSquare,
      current: location.pathname === "/client/support",
    },
    {
      name: "Paramètres",
      href: "/client/settings",
      icon: Settings,
      current: location.pathname === "/client/settings",
    },
  ];

  return (
    <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 z-[80] bg-card border-r">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
        {/* Logo and branding */}
        <div className="flex items-center flex-shrink-0 px-4 mb-5">
          <Link to="/client/dashboard" className="flex items-center gap-2">
            <img
              className="h-8 w-auto"
              src="/logo.svg"
              alt="iTakecare"
            />
            <span className="text-xl font-bold">iTakecare</span>
          </Link>
        </div>

        {/* User section */}
        <div className="px-3 mb-6">
          <SidebarUserSection />
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md group transition-colors ${
                  item.current
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    item.current 
                      ? "text-primary-foreground" 
                      : "text-muted-foreground group-hover:text-accent-foreground"
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </div>
      
      {/* Logout button */}
      <div className="flex-shrink-0 flex border-t p-4">
        <div className="flex-shrink-0 w-full group block">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = "/logout"}
          >
            Déconnexion
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientSidebar;
