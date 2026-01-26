import React from "react";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileDetailHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onMoreActions?: () => void;
}

const MobileDetailHeader: React.FC<MobileDetailHeaderProps> = ({
  title,
  subtitle,
  onBack,
  onMoreActions,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b border-border flex items-center px-2 gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="flex-shrink-0"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      <div className="flex-1 min-w-0 text-center">
        <h1 className="font-semibold text-sm truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      
      {onMoreActions ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoreActions}
          className="flex-shrink-0"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      ) : (
        <div className="w-10" /> // Spacer pour centrer le titre
      )}
    </header>
  );
};

export default MobileDetailHeader;
