
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Laptop, 
  FileText, 
  Settings, 
  LifeBuoy,
  LogOut
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ClientSidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  const initials = React.useMemo(() => {
    if (!user) return "?";
    
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }, [user]);
  
  const navItems = [
    {
      name: "Tableau de bord",
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/client/dashboard"
    },
    {
      name: "Mes équipements",
      icon: <Laptop className="h-5 w-5" />,
      path: "/client/equipment"
    },
    {
      name: "Mes demandes",
      icon: <FileText className="h-5 w-5" />,
      path: "/client/requests"
    },
    {
      name: "Support",
      icon: <LifeBuoy className="h-5 w-5" />,
      path: "/client/support"
    },
    {
      name: "Paramètres",
      icon: <Settings className="h-5 w-5" />,
      path: "/client/settings"
    }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="hidden md:flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center justify-center border-b px-4 py-2">
        <img 
          src="/logo.svg" 
          alt="iTakecare logo" 
          className="h-8"
        />
      </div>
      
      <div className="flex-1 overflow-auto py-4">
        <div className="px-4 mb-4">
          <div className="flex items-center gap-3 rounded-lg bg-accent/30 p-3">
            <Avatar className="h-10 w-10 border">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 truncate">
              <div className="text-sm font-medium leading-none truncate">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {user?.email}
              </div>
            </div>
          </div>
        </div>
        
        <nav className="space-y-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="border-t p-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
};

export default ClientSidebar;
