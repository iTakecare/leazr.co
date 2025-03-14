
import React from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Box,
  Settings,
  FileText,
  BookOpen,
  LogOut
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
              "flex items-center justify-center py-4 px-3 my-5 rounded-md transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
            )}
          >
            <Icon className="h-7 w-7" aria-hidden="true" />
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
            className="flex items-center justify-center py-4 px-3 my-5 rounded-md transition-colors text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
          >
            <Icon className="h-7 w-7" aria-hidden="true" />
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

const Sidebar = ({ className }: SidebarProps) => {
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
      <div className="flex-1 overflow-y-auto p-2 pt-8 space-y-6">
        <MenuItem
          to="/dashboard"
          icon={LayoutDashboard}
          label="Tableau de bord"
          active={isActive("/dashboard")}
        />
        <MenuItem
          to="/clients"
          icon={Users}
          label="Clients"
          active={isActive("/clients")}
        />
        <MenuItem
          to="/catalog"
          icon={Box}
          label="Catalogue"
          active={isActive("/catalog")}
        />
        <MenuItem
          to="/offers"
          icon={FileText}
          label="Offres"
          active={isActive("/offers")}
        />
        <MenuItem
          to="/contracts"
          icon={BookOpen}
          label="Contrats"
          active={isActive("/contracts")}
        />
        <MenuItem
          to="/settings"
          icon={Settings}
          label="Paramètres"
          active={isActive("/settings")}
        />
      </div>

      {user && (
        <div className="p-3 border-t flex flex-col items-center pt-6 pb-6">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-6">
            {user.email?.charAt(0).toUpperCase() || "U"}
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

export default Sidebar;
