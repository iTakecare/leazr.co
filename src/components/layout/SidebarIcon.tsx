import React, { memo, useState } from "react";
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
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10",
  };

  const iconUrl = settings?.logo_url;

  // Show loading state
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

  // Show fallback if no URL or image failed to load
  if (!iconUrl || imageError) {
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
      "rounded-lg overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center",
      sizeClasses[size],
      className
    )}>
      <img 
        src={iconUrl}
        alt={settings?.company_name || "Logo"}
        className="w-full h-full object-contain p-0.5"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default memo(SidebarIcon);
