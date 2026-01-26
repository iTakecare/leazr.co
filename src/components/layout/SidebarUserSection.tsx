
import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import NavbarUserProfile from "./NavbarUserProfile";

interface SidebarUserSectionProps {
  collapsed?: boolean;
  darkMode?: boolean;
}

const SidebarUserSection = ({ collapsed = false, darkMode = false }: SidebarUserSectionProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const getUserInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };

  const handleLogout = async () => {
    try {
      console.log("Début de la déconnexion...");
      await logout();
      console.log("Déconnexion réussie, redirection vers /login");
      toast.success("Déconnexion réussie");
      navigate("/login");
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  if (collapsed) {
    return (
      <div className="p-2">
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            darkMode ? "bg-white/10" : "bg-primary/10"
          )}>
            <span className={cn(
              "text-xs font-semibold",
              darkMode ? "text-white" : "text-primary"
            )}>
              {getUserInitials()}
            </span>
          </div>
          <Button
            variant={darkMode ? "ghost" : "outline"}
            size="sm"
            onClick={handleLogout}
            className={cn(
              "w-8 h-8 p-0 flex items-center justify-center",
              darkMode && "text-sidebar-foreground/70 hover:text-white hover:bg-white/10"
            )}
          >
            <LogOut className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className={cn(
        "flex items-center justify-start mb-3",
        darkMode && "text-white"
      )}>
        <NavbarUserProfile 
          user={user}
          avatarUrl={null}
          getUserInitials={getUserInitials}
          darkMode={darkMode}
        />
      </div>
      <Button
        variant={darkMode ? "ghost" : "outline"}
        size="sm"
        onClick={handleLogout}
        className={cn(
          "w-full flex items-center gap-2",
          darkMode && "text-sidebar-foreground/70 hover:text-white hover:bg-white/10 border-sidebar-border"
        )}
      >
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </Button>
    </div>
  );
};

export default SidebarUserSection;
