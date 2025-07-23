
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import NavbarUserProfile from "./NavbarUserProfile";
import { useSubdomain } from "@/context/SubdomainContext";

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { user } = useAuth();
  const { detection, isSubdomainDetected } = useSubdomain();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Erreur lors de la récupération de l'avatar:", error);
          return;
        }
        
        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l'avatar:", err);
      }
    };
    
    fetchAvatar();
  }, [user]);

  const getUserInitials = () => {
    if (!user) return "IT";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "IT";
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="flex h-16 items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
        
        <div className="hidden md:flex items-center space-x-3">
          {isSubdomainDetected && detection.company?.logo_url && (
            <img 
              src={detection.company.logo_url}
              alt={`Logo ${detection.company.name}`}
              className="w-8 h-8 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          )}
          <Link to="/" className="text-xl font-semibold text-primary">
            {isSubdomainDetected && detection.company ? 
              `Hub ${detection.company.name}` : 
              'Hub iTakecare'
            }
          </Link>
        </div>
        
        <div className="ml-auto flex items-center space-x-4">
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
