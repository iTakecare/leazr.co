
import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import NavbarUserProfile from "./NavbarUserProfile";

const SidebarUserSection = () => {
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
