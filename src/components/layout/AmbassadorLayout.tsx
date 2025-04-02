
import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AmbassadorSidebar from "./AmbassadorSidebar";
import Navbar from "./Navbar";

export const AmbassadorLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, isLoading, userRoleChecked, isAmbassador } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    if (!isLoading && userRoleChecked) {
      // Check if user is authenticated first
      if (!user) {
        console.log("User not authenticated, redirecting to login");
        navigate("/login");
        return;
      }
      
      // Then check if user is an ambassador
      if (!isAmbassador()) {
        console.log("Non-ambassador attempting to access ambassador space, redirecting to login");
        console.log("User roles:", {
          isAmbassador: isAmbassador(),
          ambassador_id: user?.ambassador_id,
          email: user?.email
        });
        navigate("/login");
      }
    }
  }, [user, isLoading, userRoleChecked, navigate, isAmbassador]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAmbassador()) {
    return null; // No rendering during redirection
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AmbassadorSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={handleMenuClick} />
        <main className="flex-1 overflow-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AmbassadorLayout;
