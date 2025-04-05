
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const [imageError, setImageError] = useState(false);
  
  // Fetch logo and site info on component mount
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        setIsLoading(true);
        setImageError(false);
        
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .limit(1)
          .single();
        
        if (error) {
          console.error("Error fetching site settings:", error);
          return;
        }
        
        if (data) {
          console.log("Site settings loaded for logo:", data);
          
          let effectiveLogoUrl = null;
          if (data.logo_url) {
            // Add cache-busting parameter and fix malformed URLs
            effectiveLogoUrl = getImageUrlWithCacheBuster(data.logo_url);
            console.log("Logo URL with cache buster:", effectiveLogoUrl);
          }
          
          setLogoUrl(effectiveLogoUrl);
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
  
  // Fix for URLs and add cache busting parameter
  const getImageUrlWithCacheBuster = (url: string | null): string | null => {
    if (!url) return null;
    
    try {
      // Vérifier si l'URL est un object JSON (cas d'erreur connu)
      if (url.startsWith('{') || url.startsWith('[')) {
        console.error("Invalid image URL (JSON detected):", url);
        return null;
      }
      
      // Fixer les URLs Supabase sans https:
      if (url.indexOf('//') === 0) {
        url = 'https:' + url;
      }
      
      // Nettoyer l'URL en supprimant les paramètres existants
      const urlParts = url.split('?');
      const baseUrl = urlParts[0];
      
      // Ajouter un timestamp comme paramètre de cache-busting
      return `${baseUrl}?t=${Date.now()}`;
    } catch (error) {
      console.error("Erreur lors de la génération de l'URL avec cache-busting:", error);
      return null;
    }
  };
  
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
          {logoUrl && !imageError ? (
            <img 
              src={logoUrl} 
              alt={siteInfo.siteName}
              className="w-10 h-10 object-contain"
              onError={(e) => {
                console.error("Error loading logo image:", logoUrl);
                setImageError(true);
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
        <div className="overflow-hidden">
          <h1 className="text-lg font-bold">{siteInfo.siteName}</h1>
        </div>
      )}
    </div>
  );
};

export default Logo;
