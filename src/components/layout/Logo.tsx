
import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  logoSize?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "full" | "avatar";
}

const Logo: React.FC<LogoProps> = ({ 
  className, 
  showText = false, 
  logoSize = "md", 
  variant = "avatar" 
}) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20", 
    lg: "w-24 h-24",
    xl: "w-32 h-32",
    "2xl": "w-40 h-40"
  };

  // Utiliser le nouveau logo fourni
  const logoSrc = "/lovable-uploads/55d4da90-682a-4d13-a0f6-3b47519e15c0.png";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative flex-shrink-0", sizeClasses[logoSize])}>
        <img 
          src={logoSrc}
          alt="Leazr"
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <span className="font-semibold text-lg">Leazr</span>
      )}
    </div>
  );
};

export default Logo;
