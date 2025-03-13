
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
              "flex items-center justify-center py-2 px-3 my-1 rounded-md transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
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
            className="flex items-center justify-center py-2 px-3 my-1 rounded-md transition-colors text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
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

  return (
    <div
      className={cn(
        "h-full flex flex-col border-r bg-background w-16",
        className
      )}
    >
      <div className="flex-1 overflow-y-auto p-2">
        <MenuItem
          to="/client/dashboard"
          icon={LayoutDashboard}
          label="Tableau de bord"
          active={isActive("/client/dashboard")}
        />
        <MenuItem
          to="/client/contracts"
          icon={FileText}
          label="Contrats"
          active={isActive("/client/contracts")}
        />
        <MenuItem
          to="/client/equipment"
          icon={Laptop}
          label="Équipements"
          active={isActive("/client/equipment")}
        />
        <MenuItem
          to="/client/requests"
          icon={Clock}
          label="Demandes en cours"
          active={isActive("/client/requests")}
        />
        <MenuItem
          to="/client/catalog"
          icon={Package}
          label="Catalogue"
          active={isActive("/client/catalog")}
        />
      </div>

      {user && (
        <div className="p-3 border-t flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-2">
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
