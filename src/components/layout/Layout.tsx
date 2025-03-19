
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export function Layout() {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-background to-secondary/10">
      {!isMobile && <Sidebar />}
      
      <main className="flex-1 overflow-auto p-4 md:p-6 backdrop-blur-sm">
        <Outlet />
      </main>
    </div>
  );
}
