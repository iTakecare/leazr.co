import React from "react";
import { 
  Search, 
  Bell, 
  Camera
} from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useNavigate } from "react-router-dom";

interface MobileHeaderProps {
  title?: string;
  showSearch?: boolean;
  showScanner?: boolean;
  showNotifications?: boolean;
  notificationCount?: number;
  onSearchClick?: () => void;
  onScannerClick?: () => void;
  companySlug?: string | null;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showSearch = true,
  showScanner = true,
  showNotifications = true,
  notificationCount = 0,
  onSearchClick,
  onScannerClick,
  companySlug,
}) => {
  const { settings } = useSiteSettings();
  const navigate = useNavigate();

  const basePrefix = companySlug ? `/${companySlug}` : '';

  const logoUrl = settings?.logo_url;
  const companyName = settings?.company_name || "Leazr";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border safe-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side - Scanner or spacer */}
        <div className="w-10 flex items-center justify-start">
          {showScanner && (
            <button
              onClick={onScannerClick}
              className="touch-target flex items-center justify-center"
              aria-label="Scanner un document"
            >
              <Camera className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Center - Logo/Title */}
        <div className="flex-1 flex items-center justify-center">
          {title ? (
            <h1 className="font-semibold text-base truncate">{title}</h1>
          ) : logoUrl ? (
            <img 
              src={logoUrl} 
              alt={companyName}
              className="h-7 object-contain"
            />
          ) : (
            <span className="font-bold text-lg text-primary">{companyName}</span>
          )}
        </div>

        {/* Right side - Notifications & Search */}
        <div className="flex items-center gap-1">
          {showNotifications && (
            <button
              onClick={() => navigate(`${basePrefix}/admin/notifications`)}
              className="touch-target flex items-center justify-center relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          )}
          
          {showSearch && (
            <button
              onClick={onSearchClick}
              className="touch-target flex items-center justify-center"
              aria-label="Rechercher"
            >
              <Search className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
