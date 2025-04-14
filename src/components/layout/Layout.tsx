
import React from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();

  return (
    <div className="h-screen">
      <div className="md:flex h-[calc(100vh-0px)]">
        <Sidebar 
          className={cn(
            "md:block transition-all duration-300",
            isMobile ? "fixed top-0 left-0 w-full h-full z-50 bg-white" : ""
          )}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export { Layout };
