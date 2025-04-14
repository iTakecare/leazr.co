import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileHeader from '@/components/layout/MobileHeader';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();
  
  useEffect(() => {
    const updatePendingRequestsCount = () => {
      const storedRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
      const pendingCountElement = document.getElementById('pendingRequestsCount');
      const pendingCountBadge = document.getElementById('pendingRequestsCountBadge');
      
      if (pendingCountElement) {
        pendingCountElement.textContent = storedRequests.length.toString();
        pendingCountElement.style.display = storedRequests.length > 0 ? 'flex' : 'none';
      }
      
      if (pendingCountBadge) {
        pendingCountBadge.textContent = storedRequests.length.toString();
        pendingCountBadge.style.display = storedRequests.length > 0 ? 'flex' : 'none';
      }
    };
    
    updatePendingRequestsCount();
    const interval = setInterval(updatePendingRequestsCount, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        {isMobile && <MobileHeader />}
        <main className={`${isMobile ? 'mt-16' : ''} min-h-screen`}>
          <Outlet />
        </main>
      </div>
      
      <Toaster />
    </div>
  );
};

export default MainLayout;
