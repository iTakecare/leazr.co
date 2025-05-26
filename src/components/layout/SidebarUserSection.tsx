
import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NavbarUserProfile from "./NavbarUserProfile";

const SidebarUserSection = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getUserInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <NavbarUserProfile 
          user={user}
          avatarUrl={null}
          getUserInitials={getUserInitials}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="w-full flex items-center gap-2"
      >
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </Button>
    </div>
  );
};

export default SidebarUserSection;
