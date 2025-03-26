
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteInfo, setSiteInfo] = useState({
    siteName: "iTakecare",
    siteDescription: "Hub de gestion"
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch logo and site info on component mount
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        setIsLoading(true);
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
          setLogoUrl(data.logo_url || null);
          setSiteInfo({
            siteName: data.site_name || "iTakecare",
            siteDescription: data.site_description || "Hub de gestion"
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
  
  // Génère les initiales de l'utilisateur ou utilise IT par défaut
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
        
        {/* Logo container avec image ou initiales */}
        <div className="relative flex items-center justify-center w-10 h-10 bg-background rounded-xl shadow-md overflow-hidden">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={siteInfo.siteName}
              className="w-10 h-10 object-contain"
              onError={(e) => {
                console.error("Error loading logo image:", logoUrl);
                // Si l'image ne charge pas, afficher les initiales à la place
                (e.target as HTMLImageElement).style.display = 'none';
                document.getElementById('logo-fallback')?.classList.remove('hidden');
              }}
            />
          ) : isLoading ? (
            <div className="animate-pulse bg-gray-200 w-6 h-6 rounded-md"></div>
          ) : (
            <img 
              src="/site-favicon.ico" 
              alt="iTakecare Logo"
              className="w-7 h-7 object-contain"
              onError={(e) => {
                // Si l'image ne charge pas, afficher les initiales à la place
                (e.target as HTMLImageElement).style.display = 'none';
                document.getElementById('logo-fallback')?.classList.remove('hidden');
              }}
            />
          )}
          <span id="logo-fallback" className={logoUrl ? "hidden" : "font-bold text-primary text-lg"}>
            {getUserInitials()}
          </span>
        </div>
      </div>
      
      {showText && (
        <div className="overflow-hidden">
          <h1 className="text-lg font-bold">{siteInfo.siteName}</h1>
          <p className="text-xs text-muted-foreground">{siteInfo.siteDescription}</p>
        </div>
      )}
    </div>
  );
};

export default Logo;
