import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Bell, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import Logo from "./Logo";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import NavbarUserProfile from "./NavbarUserProfile";
import { supabase } from "@/integrations/supabase/client";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Récupérer l'URL de l'avatar lors du chargement du composant
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Erreur lors de la récupération des données utilisateur:", error);
          return;
        }
        
        setAvatarUrl(data?.avatar_url || null);
      } catch (error) {
        console.error("Erreur lors de la récupération des données utilisateur:", error);
      }
    };
    
    fetchUserData();
  }, [user]);

  // Génère les initiales de l'utilisateur
  const getUserInitials = () => {
    if (!user) return "";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "";
  };

  // Bascule entre les thèmes clair et sombre
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Afficher la barre de navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 sm:w-80">
              <div className="py-4">
                <Logo />
              </div>
              {/* Contenu de la barre latérale mobile */}
            </SheetContent>
          </Sheet>
          <Logo className="hidden md:flex" />
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-full">
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">
              Basculer vers le thème {theme === "dark" ? "clair" : "sombre"}
            </span>
          </Button>
          
          <Button variant="outline" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          
          {user && (
            <NavbarUserProfile 
              user={user} 
              avatarUrl={avatarUrl} 
              getUserInitials={getUserInitials} 
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
