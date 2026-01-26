import React from "react";
import { cn } from "@/lib/utils";

interface MobilePageContainerProps {
  children: React.ReactNode;
  className?: string;
  hasHeader?: boolean;
  hasBottomNav?: boolean;
  noPadding?: boolean;
}

const MobilePageContainer: React.FC<MobilePageContainerProps> = ({
  children,
  className,
  hasHeader = true,
  hasBottomNav = true,
  noPadding = false,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col min-h-screen w-full bg-background momentum-scroll",
        hasHeader && "pt-14", // Header height
        hasBottomNav && "pb-20", // Bottom nav height + safe area
        !noPadding && "px-4",
        className
      )}
    >
      {children}
    </div>
  );
};

export default MobilePageContainer;
