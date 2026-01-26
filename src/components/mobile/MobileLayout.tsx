import React, { Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

// Lazy load components to avoid bundling issues with dexie
const MobileHeader = lazy(() => import("./MobileHeader"));
const MobileBottomNav = lazy(() => import("./MobileBottomNav"));
const MobilePageContainer = lazy(() => import("./MobilePageContainer"));
const OfflineIndicator = lazy(() => import("./OfflineIndicator"));

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

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Offline Indicator */}
      <Suspense fallback={null}>
        <OfflineIndicator />
      </Suspense>
      
      {/* Header */}
      <Suspense fallback={<div className="h-14 bg-background border-b" />}>
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
      </Suspense>

      {/* Page Content */}
      <Suspense fallback={<LoadingSpinner />}>
        <MobilePageContainer 
          hasHeader={true} 
          hasBottomNav={hasBottomNav}
          noPadding={noPadding}
        >
          {children}
        </MobilePageContainer>
      </Suspense>

      {/* Bottom Navigation */}
      {hasBottomNav && (
        <Suspense fallback={<div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t" />}>
          <MobileBottomNav 
            companySlug={companySlug} 
            userRole={userRole} 
          />
        </Suspense>
      )}
    </div>
  );
};

export default MobileLayout;
