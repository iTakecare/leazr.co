
import React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full" | "custom";
}

const Container: React.FC<ContainerProps> = ({ 
  children, 
  className,
  maxWidth = "lg"
}) => {
  const maxWidthClass = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    "7xl": "max-w-[1536px]", // New wider option for product detail pages
    full: "max-w-full",
    custom: "max-w-[1400px]"
  }[maxWidth];

  return (
    <div className={cn("mx-auto px-4 w-full", maxWidthClass, className)}>
      {children}
    </div>
  );
};

export default Container;
