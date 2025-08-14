
import React from "react";
import { cn } from "@/lib/utils";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface LogoProps {
  className?: string;
  showText?: boolean;
  logoSize?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "full" | "avatar";
  hideLogo?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  className, 
  showText = false, 
  logoSize = "md", 
  variant = "avatar",
  hideLogo = false
}) => {
  const { settings, loading } = usePlatformSettings();
  
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16", 
    lg: "w-20 h-20",
    xl: "w-28 h-28",
    "2xl": "w-36 h-36"
  };

  // If hideLogo is true or no logo is configured, don't render anything
  if (hideLogo || (!loading && (!settings?.logo_url || settings.logo_url.trim() === ''))) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("relative flex-shrink-0 bg-muted animate-pulse rounded", sizeClasses[logoSize])}>
        </div>
      </div>
    );
  }

  const logoUrl = settings?.logo_url;
  const platformName = settings?.company_name || "Platform";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative flex-shrink-0", sizeClasses[logoSize])}>
        <img 
          src={logoUrl}
          alt={`${platformName} Logo`}
          className="w-full h-full object-contain"
          onError={(e) => {
            // If logo fails to load, hide the component
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>
      {showText && settings?.company_name && (
        <span className="font-semibold">{settings.company_name}</span>
      )}
    </div>
  );
};

export default Logo;
