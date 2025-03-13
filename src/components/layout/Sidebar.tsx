
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  Box,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  FileText,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const MenuItem = ({
  to,
  icon: Icon,
  label,
  collapsed,
  active,
}: {
  to: string;
  icon: any;
  label: string;
  collapsed: boolean;
  active: boolean;
}) => {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center py-2 px-3 my-1 rounded-md transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
      )}
    >
      <Icon
        className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-2")}
        aria-hidden="true"
      />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
};

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { currentUser } = useAuth();

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col border-r bg-background",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      <div className="p-2">
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={toggleCollapse}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </div>

      <div className="p-2 flex-1 overflow-y-auto">
        <MenuItem
          to="/dashboard"
          icon={Home}
          label="Tableau de bord"
          collapsed={collapsed}
          active={isActive("/dashboard")}
        />
        <MenuItem
          to="/clients"
          icon={Users}
          label="Clients"
          collapsed={collapsed}
          active={isActive("/clients")}
        />
        <MenuItem
          to="/catalog"
          icon={Box}
          label="Catalogue"
          collapsed={collapsed}
          active={isActive("/catalog")}
        />
        <MenuItem
          to="/offers"
          icon={FileText}
          label="Offres"
          collapsed={collapsed}
          active={isActive("/offers")}
        />
        <MenuItem
          to="/contracts"
          icon={BookOpen}
          label="Contrats"
          collapsed={collapsed}
          active={isActive("/contracts")}
        />
        <MenuItem
          to="/settings"
          icon={Settings}
          label="Paramètres"
          collapsed={collapsed}
          active={isActive("/settings")}
        />
      </div>

      {!collapsed && currentUser && (
        <div className="p-3 border-t">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              {currentUser.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="ml-2 overflow-hidden">
              <p className="text-sm font-medium truncate">
                {currentUser.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Administrateur
              </p>
            </div>
          </div>
        </div>
      )}

      {collapsed && currentUser && (
        <div className="p-3 border-t flex justify-center">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            {currentUser.email?.charAt(0).toUpperCase() || "U"}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
