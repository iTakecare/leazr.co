import React from "react";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileHeader from "./MobileHeader";
import MobileBottomNav from "./MobileBottomNav";
import MobilePageContainer from "./MobilePageContainer";
import OfflineIndicator from "./OfflineIndicator";

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  showScanner?: boolean;
  showNotifications?: boolean;
  notificationCount?: number;
  onSearchClick?: () => void;
  onScannerClick?: () => void;
  hasBottomNav?: boolean;
  noPadding?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  showSearch = true,
  showScanner = true,
  showNotifications = true,
  notificationCount = 0,
  onSearchClick,
  onScannerClick,
  hasBottomNav = true,
  noPadding = false,
}) => {
  const location = useLocation();
  const isMobile = useIsMobile();

  // Extract company slug and user role from path
  const getCompanySlugAndRole = () => {
    const pathMatch = location.pathname.match(/^\/([^\/]+)\/(admin|client|ambassador)/);
    return {
      companySlug: pathMatch?.[1] || null,
      userRole: (pathMatch?.[2] as 'admin' | 'client' | 'ambassador') || 'admin',
    };
  };

  const { companySlug, userRole } = getCompanySlugAndRole();

  // If not mobile, just render children
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Header */}
      <MobileHeader
        title={title}
        showSearch={showSearch}
        showScanner={showScanner}
        showNotifications={showNotifications}
        notificationCount={notificationCount}
        onSearchClick={onSearchClick}
        onScannerClick={onScannerClick}
        companySlug={companySlug}
      />

      {/* Page Content */}
      <MobilePageContainer 
        hasHeader={true} 
        hasBottomNav={hasBottomNav}
        noPadding={noPadding}
      >
        {children}
      </MobilePageContainer>

      {/* Bottom Navigation */}
      {hasBottomNav && (
        <MobileBottomNav 
          companySlug={companySlug} 
          userRole={userRole} 
        />
      )}
    </div>
  );
};

export default MobileLayout;
