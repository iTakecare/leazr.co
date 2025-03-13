
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  Box,
  Settings,
  FileText,
  BookOpen
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

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
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
          to="/dashboard"
          icon={Home}
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
        <div className="p-3 border-t flex justify-center">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            {user.email?.charAt(0).toUpperCase() || "U"}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
