import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const showSidebar = !isMobile || isMenuOpen;

  return (
    <div className="h-screen">
      <Navbar onMenuClick={toggleMenu} />
      <div className="md:flex h-[calc(100vh-64px)]">
        {showSidebar && (
          <Sidebar 
            className={cn(
              "md:block transition-all duration-300",
              isMobile ? "fixed top-0 left-0 w-full h-full z-50 bg-white" : ""
            )}
            onLinkClick={() => isMobile && setIsMenuOpen(false)}
          />
        )}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export { Layout };
