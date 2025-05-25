
import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  logoSize?: "sm" | "md" | "lg";
  variant?: "full" | "avatar";
}

const Logo: React.FC<LogoProps> = ({ 
  className, 
  showText = true, 
  logoSize = "md", 
  variant = "avatar" 
}) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10", 
    lg: "w-12 h-12"
  };

  const logoSrc = variant === "full" 
    ? "/lovable-uploads/52ac938f-82c5-49f9-907b-41009e38278b.png"
    : "/lovable-uploads/272b9141-d54c-4944-9623-63c22edcadf3.png";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative flex-shrink-0", variant === "full" ? "w-auto h-8" : sizeClasses[logoSize])}>
        <img 
          src={logoSrc}
          alt="Leazr"
          className={variant === "full" ? "h-full w-auto object-contain" : "w-full h-full object-contain"}
        />
      </div>
      {showText && variant !== "full" && (
        <span className="font-semibold">Leazr</span>
      )}
    </div>
  );
};

export default Logo;
