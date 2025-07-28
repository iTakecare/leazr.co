
import React, { memo } from "react";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import Logo from "./Logo";

interface CompanyLogoProps {
  className?: string;
  showText?: boolean;
  logoSize?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "full" | "avatar";
  forceDefaultLogo?: boolean;
  textSize?: "xs" | "sm" | "base" | "lg";
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({ 
  className, 
  showText = false, 
  logoSize = "lg", 
  variant = "avatar",
  forceDefaultLogo = false,
  textSize = "lg"
}) => {
  const { settings, loading } = useSiteSettings();

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24", 
    lg: "w-32 h-32",
    xl: "w-40 h-40",
    "2xl": "w-48 h-48"
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg"
  };

  // Si on charge encore, ne rien afficher pour éviter tout clignotement
  if (loading) {
    return null;
  }

  // Si forceDefaultLogo est true ou s'il n'y a pas de logo d'entreprise, utiliser le logo par défaut
  if (forceDefaultLogo || !settings?.logo_url) {
    return <Logo className={className} showText={showText} logoSize={logoSize} variant={variant} />;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative flex-shrink-0", sizeClasses[logoSize])}>
        <img 
          src={settings.logo_url}
          alt={settings.company_name || "Logo de l'entreprise"}
          className="w-full h-full object-contain"
          onError={(e) => {
            // En cas d'erreur de chargement, utiliser le logo par défaut
            const target = e.target as HTMLImageElement;
            target.src = "/leazr-logo.png";
            target.alt = "Leazr";
          }}
        />
      </div>
      {showText && settings.company_name && (
        <span className={cn("font-semibold", textSizeClasses[textSize])}>{settings.company_name}</span>
      )}
    </div>
  );
};

export default memo(CompanyLogo);
