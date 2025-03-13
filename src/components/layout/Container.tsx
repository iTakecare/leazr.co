
import React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const Container = ({
  children,
  className,
  maxWidth = "xl",
  ...props
}: ContainerProps) => {
  const maxWidthClass = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full",
  };

  return (
    <div
      className={cn(
        "w-full px-4 mx-auto",
        maxWidthClass[maxWidth],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Container;
