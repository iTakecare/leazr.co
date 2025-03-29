
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSiteSettings } from "@/services/settingsService";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteInfo, setSiteInfo] = useState({
    siteName: "iTakecare"
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        setIsLoading(true);
        const data = await getSiteSettings();
        
        if (data) {
          console.log("Site settings loaded for logo:", data);
          
          if (data.logo_url) {
            // Add cache-busting parameter
            const cacheBuster = `?t=${Date.now()}`;
            setLogoUrl(`${data.logo_url}${cacheBuster}`);
          }
          
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
    
    // Set up a subscription to site_settings changes
    const channel = supabase.channel('site_settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'site_settings' },
        () => {
          console.log('Site settings updated, refreshing logo');
          fetchSiteSettings();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getUserInitials = () => {
    if (!user) return "IT";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "IT";
  };

  console.log("Current logo URL:", logoUrl); // Debug log

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-primary/20 rounded-xl rotate-6"></div>
        <div className="absolute inset-0 bg-primary/10 rounded-xl -rotate-6"></div>
        
        <div className="relative flex items-center justify-center w-10 h-10 bg-background rounded-xl shadow-md overflow-hidden">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={siteInfo.siteName}
              className="w-10 h-10 object-contain"
              onError={(e) => {
                console.error("Error loading logo image:", logoUrl);
                e.currentTarget.style.display = 'none';
                const fallback = document.getElementById('logo-fallback');
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          ) : isLoading ? (
            <div className="animate-pulse bg-gray-200 w-6 h-6 rounded-md"></div>
          ) : (
            <div className="w-7 h-7 flex items-center justify-center">
              <span id="logo-fallback" className="font-bold text-primary text-lg">
                {getUserInitials()}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {showText && (
        <div className="overflow-hidden">
          <h1 className="text-lg font-bold">{siteInfo.siteName}</h1>
        </div>
      )}
    </div>
  );
};

export default Logo;
