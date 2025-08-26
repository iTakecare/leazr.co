
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

  // If hideLogo is true, don't render anything
  if (hideLogo) {
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

  // Use fallback values if settings are missing or invalid
  const logoUrl = settings?.logo_url?.trim() || "/leazr-logo.png";
  const platformName = settings?.company_name || "Leazr";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative flex-shrink-0", sizeClasses[logoSize])}>
        <img 
          src={logoUrl}
          alt={`${platformName} Logo`}
          className="w-full h-full object-contain"
          onError={(e) => {
            // If logo fails to load, fallback to Leazr logo
            const target = e.target as HTMLImageElement;
            if (target.src !== "/leazr-logo.png") {
              target.src = "/leazr-logo.png";
            } else {
              target.style.display = 'none';
            }
          }}
        />
      </div>
      {showText && (
        <span className="font-semibold">{platformName}</span>
      )}
    </div>
  );
};

export default Logo;
