
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
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

const ClientSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

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

  const getUserInitials = () => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (userEmail) {
      return userEmail.substring(0, 2).toUpperCase();
    }
    return "CL";
  };

  return (
    <div className={cn(
      "hidden md:flex md:flex-col md:fixed md:inset-y-0 z-[80] bg-white border-r transition-all duration-300",
      collapsed ? "md:w-[80px]" : "md:w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Logo and branding */}
        <div className={cn(
          "flex items-center flex-shrink-0 px-5 py-6 border-b",
          collapsed ? "justify-center" : ""
        )}>
          <Link to="/client/dashboard" className="flex items-center gap-2">
            <img
              className="h-8 w-auto"
              src="/logo.svg"
              alt="iTakecare"
            />
            {!collapsed && <span className="text-xl font-bold">iTakecare</span>}
          </Link>
          
          {!collapsed && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCollapsed(true)} 
              className="ml-auto rounded-full hover:bg-primary/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 overflow-y-auto">
          <nav className="space-y-1">
            <TooltipProvider delayDuration={200}>
              {navigationItems.map((item) => (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                        collapsed ? "justify-center px-2" : "px-3",
                        item.active
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-y-[-2px]"
                          : "text-gray-700 hover:bg-primary/10 hover:text-primary hover:translate-y-[-2px]"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0", 
                          collapsed ? "" : "mr-3",
                          item.active && "stroke-[2.5px]"
                        )}
                      />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="font-medium">
                      <p>{item.name}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </TooltipProvider>
          </nav>
        </div>

        {/* User info */}
        <div className={cn(
          "p-4 transition-all duration-300 mt-auto mx-2 mb-4 border-t border-t-primary/10 pt-4",
          collapsed ? "px-2" : ""
        )}>
          {!collapsed ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="" alt="Avatar utilisateur" />
                  <AvatarFallback className="bg-primary/20 text-primary">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">Client</p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:shadow"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleLogout}
                    className="w-full h-10 flex justify-center text-destructive/80 hover:bg-destructive/10 hover:text-destructive rounded-xl"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Déconnexion</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Déconnexion</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Button to expand sidebar */}
        {collapsed && (
          <div className="p-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCollapsed(false)} 
              className="w-full flex justify-center items-center h-10 rounded-xl hover:bg-primary/10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientSidebar;
