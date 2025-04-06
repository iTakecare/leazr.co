
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  const { user } = useAuth();
  const [siteInfo, setSiteInfo] = useState({
    siteName: "iTakecare"
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Image fixe à utiliser comme logo depuis le bucket Supabase
  const fixedLogoUrl = "https://cifbetjefyfocafanlhv.supabase.co/storage/v1/object/public/site-settings/logos/ITC-Icone-t512.png";
  
  // Fetch site info on component mount (uniquement pour le nom du site)
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        setIsLoading(true);
        
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('site_settings')
          .select('site_name')
          .limit(1)
          .single();
        
        if (error) {
          console.error("Error fetching site settings:", error);
          return;
        }
        
        if (data) {
          setSiteInfo({
            siteName: data.site_name || "iTakecare"
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
  
  // Generate user initials or use IT by default
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
        
        <div className="relative flex items-center justify-center w-10 h-10 bg-background rounded-xl shadow-md overflow-hidden">
          {fixedLogoUrl ? (
            <img 
              src={fixedLogoUrl} 
              alt={siteInfo.siteName}
              className="w-10 h-10 object-contain"
              onError={(e) => {
                console.error("Error loading fixed logo image");
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
      
      {showText && (
        <div className="overflow-hidden flex flex-col">
          <h1 className="text-lg font-bold">{siteInfo.siteName}</h1>
          <span className="text-xs text-muted-foreground -mt-1">Hub de gestion</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
