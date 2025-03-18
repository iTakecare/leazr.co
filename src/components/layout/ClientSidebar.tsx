
import React from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Laptop,
  Clock,
  Package,
  LogOut,
  Calculator,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface MenuItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}

const MenuItem = ({ to, icon: Icon, label, active }: MenuItemProps) => {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={to}
            className={cn(
              "flex items-center justify-center py-4 px-3 my-5 rounded-md transition-all",
              active
                ? "bg-primary/15 text-primary shadow-sm translate-x-1"
                : "text-muted-foreground hover:bg-primary/5 hover:text-primary hover:translate-x-1"
            )}
          >
            <Icon className={cn("h-7 w-7", active && "stroke-[2.5px]")} aria-hidden="true" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface ActionItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

const ActionItem = ({ icon: Icon, label, onClick }: ActionItemProps) => {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="flex items-center justify-center py-4 px-3 my-5 rounded-md transition-colors text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
          >
            <Icon className="h-7 w-7" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface SidebarProps {
  className?: string;
}

const ClientSidebar = ({ className }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const sidebarItems = [
    { path: "/client/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { path: "/client/contracts", icon: FileText, label: "Contrats" },
    { path: "/client/equipment", icon: Laptop, label: "Équipements" },
    { path: "/client/requests", icon: Clock, label: "Demandes en cours" },
    { path: "/client/catalog", icon: Package, label: "Catalogue" },
    { path: "/client/calculator", icon: Calculator, label: "Calculateur" },
    { path: "/client/itakecare", icon: Shield, label: "Packs iTakecare" },
  ];

  return (
    <div
      className={cn(
        "h-full flex flex-col border-r bg-gradient-to-b from-background to-muted/20 w-16 shadow-md",
        className
      )}
    >
      <div className="flex-1 overflow-y-auto py-8 px-2">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
            IT
          </div>
        </div>
        <div className="space-y-6">
          {sidebarItems.map((item) => (
            <MenuItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
              active={isActive(item.path)}
            />
          ))}
        </div>
      </div>

      {user && (
        <div className="p-3 border-t border-t-muted/40 flex flex-col items-center pt-6 pb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center text-primary font-medium mb-6 shadow-sm">
            {user.first_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <ActionItem 
            icon={LogOut} 
            label="Déconnexion" 
            onClick={handleLogout} 
          />
        </div>
      )}
    </div>
  );
};

export default ClientSidebar;
