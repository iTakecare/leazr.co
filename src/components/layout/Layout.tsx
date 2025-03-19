
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function Layout() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-secondary/10">
      <div className="flex-1 flex overflow-hidden">
        {isMobile ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm shadow-md rounded-full"
              aria-label="Menu"
            >
              <Menu className="h-6 w-6 text-primary" />
              <span className="sr-only">Menu</span>
            </Button>
            
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent side="left" className="p-0 w-[80vw] max-w-[300px] border-r-primary/10 bg-gradient-to-b from-background to-muted/50">
                <Sidebar className="h-full w-full border-none" onLinkClick={() => setSidebarOpen(false)} />
              </SheetContent>
            </Sheet>
            
            <main className="flex-1 overflow-auto pt-16 px-4 pb-20 md:p-6 w-full backdrop-blur-sm">
              <Outlet />
            </main>
          </>
        ) : (
          <>
            <Sidebar className="bg-gradient-to-b from-background to-muted/50 border-r border-r-primary/10 shadow-md" />
            <main className="flex-1 overflow-auto p-4 md:p-6 backdrop-blur-sm">
              <Outlet />
            </main>
          </>
        )}
      </div>
    </div>
  );
}
