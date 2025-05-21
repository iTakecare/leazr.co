
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
    siteName: "Leazr"
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Use the Leazr logo
  const fixedLogoUrl = "/lovable-uploads/d018d145-840d-4367-8d48-0cf08f7770a8.png";
  
  // Fetch site info on component mount (only for site name)
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
            siteName: data.site_name || "Leazr"
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

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-shrink-0">
        {fixedLogoUrl ? (
          <img 
            src={fixedLogoUrl} 
            alt={siteInfo.siteName}
            className="w-20 h-20 object-contain" // Augmenté de w-12 h-12 à w-20 h-20
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
      
      {/* Removed the title text from here */}
    </div>
  );
};

export default Logo;
