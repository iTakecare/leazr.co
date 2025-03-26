
import React from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  const { user } = useAuth();
  
  // Génère les initiales de l'utilisateur ou utilise IT par défaut
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
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-primary/20 rounded-xl rotate-6"></div>
        <div className="absolute inset-0 bg-primary/10 rounded-xl -rotate-6"></div>
        
        {/* Logo container avec image ou initiales */}
        <div className="relative flex items-center justify-center w-10 h-10 bg-background rounded-xl shadow-md">
          {/* Si une image de logo existe dans public/site-favicon.ico, l'utiliser */}
          <img 
            src="/site-favicon.ico" 
            alt="iTakecare Logo"
            className="w-7 h-7 object-contain"
            onError={(e) => {
              // Si l'image ne charge pas, afficher les initiales à la place
              (e.target as HTMLImageElement).style.display = 'none';
              document.getElementById('logo-fallback')?.classList.remove('hidden');
            }}
          />
          <span id="logo-fallback" className="hidden font-bold text-primary text-lg">
            {getUserInitials()}
          </span>
        </div>
      </div>
      
      {showText && (
        <div className="overflow-hidden">
          <h1 className="text-lg font-bold">iTakecare</h1>
          <p className="text-xs text-muted-foreground">Hub de gestion</p>
        </div>
      )}
    </div>
  );
};

export default Logo;
