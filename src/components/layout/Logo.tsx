
import React from "react";
import { cn } from "@/lib/utils";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface LogoProps {
  className?: string;
  showText?: boolean;
  logoSize?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "full" | "avatar";
}

const Logo: React.FC<LogoProps> = ({ 
  className, 
  showText = false, 
  logoSize = "md", 
  variant = "avatar" 
}) => {
  const { settings } = usePlatformSettings();
  
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16", 
    lg: "w-20 h-20",
    xl: "w-28 h-28",
    "2xl": "w-36 h-36"
  };

  // Utiliser le logo des paramètres de la plateforme ou fallback
  const logoUrl = settings?.logo_url || "/leazr-logo.png";
  const logoAlt = settings?.company_name || "Leazr";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative flex-shrink-0", sizeClasses[logoSize])}>
        <img 
          src={logoUrl}
          alt={logoAlt}
          className="w-full h-full object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/leazr-logo.png"; // Fallback vers le logo par défaut
          }}
        />
      </div>
      {showText && (
        <span className="font-semibold text-lg">{logoAlt}</span>
      )}
    </div>
  );
};

export default Logo;
