
import React from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const PageTransition = ({ children, className }: PageTransitionProps) => {
  return (
    <div className={cn("w-full h-full", className)}>
      {children}
    </div>
  );
};

export default PageTransition;
