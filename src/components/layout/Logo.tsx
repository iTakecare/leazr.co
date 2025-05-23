
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getCacheBustedUrl } from "@/services/fileUploadService";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  const { user } = useAuth();
  const [siteInfo, setSiteInfo] = useState({
    siteName: "Leazr",
    logoUrl: null as string | null
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch site info on component mount (for site name and logo)
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        setIsLoading(true);
        
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('site_settings')
          .select('site_name, logo_url')
          .limit(1)
          .single();
        
        if (error) {
          console.error("Error fetching site settings:", error);
          return;
        }
        
        if (data) {
          setSiteInfo({
            siteName: data.site_name || "Leazr",
            logoUrl: data.logo_url
          });
        }
      } catch (error) {
        console.error("Error in Logo component:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSiteSettings();
  }, []);
  
  // Generate user initials or use LZ by default
  const getUserInitials = () => {
    if (!user) return "LZ";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "LZ";
  };

  // URL avec cache-busting pour éviter les problèmes de cache
  const logoUrl = siteInfo.logoUrl ? getCacheBustedUrl(siteInfo.logoUrl) : null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-shrink-0">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={siteInfo.siteName}
            className="w-28 h-28 object-contain" 
            onError={(e) => {
              console.error("Error loading logo image");
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : isLoading ? (
          <div className="animate-pulse bg-gray-200 w-6 h-6 rounded-md"></div>
        ) : (
          <span className="font-bold text-primary text-lg">
            {getUserInitials()}
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
