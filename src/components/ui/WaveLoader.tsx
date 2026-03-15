
import React from "react";
import { cn } from "@/lib/utils";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface WaveLoaderProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  className?: string;
}

const WaveLoader: React.FC<WaveLoaderProps> = ({ 
  size = "md", 
  message = "Chargement...",
  className 
}) => {
  const { settings } = usePlatformSettings();
  
  const logoUrl = settings?.logo_url?.trim() || "/leazr-logo.png";

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Background: greyed out logo */}
        <img
          src={logoUrl}
          alt="Loading"
          className="absolute inset-0 w-full h-full object-contain grayscale opacity-20"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== "/leazr-logo.png") target.src = "/leazr-logo.png";
          }}
        />

        {/* Foreground: colored logo revealed by rising wave */}
        <div className="absolute inset-0 overflow-hidden animate-wave-rise">
          {/* Wave SVG at the top edge */}
          <div className="absolute -top-2 left-0 w-[200%] h-3 animate-wave-move">
            <svg viewBox="0 0 400 12" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M0,6 C50,0 100,12 150,6 C200,0 250,12 300,6 C350,0 400,12 400,6 L400,12 L0,12 Z"
                className="fill-primary/30"
              />
            </svg>
          </div>
          <img
            src={logoUrl}
            alt="Loading"
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== "/leazr-logo.png") target.src = "/leazr-logo.png";
            }}
          />
        </div>
      </div>

      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
};

export default WaveLoader;
