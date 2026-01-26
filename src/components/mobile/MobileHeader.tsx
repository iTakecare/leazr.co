import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, 
  X, 
  Search, 
  Bell, 
  Camera,
  Settings,
  LogOut,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
  const { user, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const basePrefix = companySlug ? `/${companySlug}` : '';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const logoUrl = settings?.logo_url;
  const companyName = settings?.company_name || "Leazr";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border safe-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side - Menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button 
              className="touch-target flex items-center justify-center"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={companyName}
                    className="h-8 w-8 rounded-lg object-contain"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">
                      {companyName.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{companyName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 p-4 space-y-1">
                <button
                  onClick={() => {
                    navigate(`${basePrefix}/admin/settings`);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors touch-target"
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Paramètres</span>
                </button>
                <button
                  onClick={() => {
                    navigate(`${basePrefix}/admin/settings`);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors touch-target"
                >
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Mon profil</span>
                </button>
              </nav>

              {/* Sign Out */}
              <div className="p-4 border-t border-border">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors touch-target"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm font-medium">Déconnexion</span>
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Scanner button */}
        {showScanner && (
          <button
            onClick={onScannerClick}
            className="touch-target flex items-center justify-center"
            aria-label="Scanner un document"
          >
            <Camera className="h-5 w-5 text-muted-foreground" />
          </button>
        )}

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
