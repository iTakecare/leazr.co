import React, { memo } from "react";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Building2 } from "lucide-react";

interface SidebarIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SidebarIcon: React.FC<SidebarIconProps> = ({ 
  className,
  size = "md"
}) => {
  const { settings, loading } = useSiteSettings();

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10",
  };

  // Use favicon if available, otherwise logo, otherwise default icon
  const iconUrl = settings?.logo_url;

  if (loading) {
    return (
      <div className={cn(
        "rounded-lg bg-sidebar-muted flex items-center justify-center",
        sizeClasses[size],
        className
      )}>
        <Building2 className="w-4 h-4 text-sidebar-foreground/50" />
      </div>
    );
  }

  if (!iconUrl) {
    return (
      <div className={cn(
        "rounded-lg bg-primary/20 flex items-center justify-center",
        sizeClasses[size],
        className
      )}>
        <Building2 className="w-4 h-4 text-primary" />
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg overflow-hidden flex-shrink-0 bg-white/10",
      sizeClasses[size],
      className
    )}>
      <img 
        src={iconUrl}
        alt={settings?.company_name || "Logo"}
        className="w-full h-full object-contain p-1"
        onError={(e) => {
          // On error, hide image and show fallback
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    </div>
  );
};

export default memo(SidebarIcon);
