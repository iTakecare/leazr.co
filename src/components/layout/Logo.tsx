
import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-shrink-0 w-8 h-8">
        <img 
          src="/lovable-uploads/86dbf5bf-b473-4de5-9a3a-512a82b87fa4.png" 
          alt="Leazr"
          className="w-full h-full object-contain" 
        />
      </div>
      {showText && (
        <span className="font-semibold">Leazr</span>
      )}
    </div>
  );
};

export default Logo;
