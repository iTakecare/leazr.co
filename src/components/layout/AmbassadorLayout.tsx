
import React from "react";
import { Outlet } from "react-router-dom";
import AmbassadorSidebar from "./AmbassadorSidebar";

export const AmbassadorLayout = ({ children }: { children?: React.ReactNode }) => {
  console.log('🏠 AMBASSADOR LAYOUT - Rendering layout');
  console.log('🏠 AMBASSADOR LAYOUT - Children:', !!children);
  console.log('🏠 AMBASSADOR LAYOUT - Current pathname:', window.location.pathname);
  console.log('🏠 AMBASSADOR LAYOUT - About to render sidebar and main content');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AmbassadorSidebar />
      <div className="flex flex-1 flex-col overflow-hidden transition-all duration-300 ml-16 md:ml-64">
        <main className="flex-1 overflow-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AmbassadorLayout;
