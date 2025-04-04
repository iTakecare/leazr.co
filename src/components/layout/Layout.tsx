
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider } from '@/components/ui/sidebar';

export function Layout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex bg-gradient-to-br from-background to-primary/5">
        <Sidebar />
        
        <main className="flex-1 relative">
          <div className="absolute inset-0 pointer-events-none bg-[url('/grid-pattern.svg')] bg-center opacity-[0.02]" />
          <ScrollArea className="h-screen">
            <div className="p-4 md:p-6 pb-24">
              <Outlet />
            </div>
          </ScrollArea>
        </main>
      </div>
    </SidebarProvider>
  );
}
