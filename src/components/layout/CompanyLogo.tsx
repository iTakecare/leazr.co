
import React from "react";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import Logo from "./Logo";

interface CompanyLogoProps {
  className?: string;
  showText?: boolean;
  logoSize?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "full" | "avatar";
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({ 
  className, 
  showText = false, 
  logoSize = "md", 
  variant = "avatar" 
}) => {
  const { settings, loading } = useSiteSettings();

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20", 
    lg: "w-24 h-24",
    xl: "w-32 h-32",
    "2xl": "w-40 h-40"
  };

  // Si on charge encore ou qu'il n'y a pas de logo d'entreprise, utiliser le logo par défaut
  if (loading || !settings?.logo_url) {
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
            target.src = "/lovable-uploads/55d4da90-682a-4d13-a0f6-3b47519e15c0.png";
            target.alt = "Leazr";
          }}
        />
      </div>
      {showText && settings.company_name && (
        <span className="font-semibold text-lg">{settings.company_name}</span>
      )}
    </div>
  );
};

export default CompanyLogo;
