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
      // `app-scroll` : en natif, c'est ce conteneur — et lui seul — qui défile.
      // Les data-* pilotent les marges système (voir styles/native.css).
      data-no-header={!hasHeader}
      data-no-bottom-nav={!hasBottomNav}
      className={cn(
        "app-scroll flex flex-col min-h-screen w-full bg-background momentum-scroll",
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
