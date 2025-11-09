import { useState } from "react";
import { GripVertical, Trash2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PartnerLogo {
  id: string;
  name: string;
  logo_url: string;
  display_order: number;
  is_active: boolean;
}

interface PartnerLogoCardProps {
  logo: PartnerLogo;
  isSelected?: boolean;
  showCheckbox?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onEdit?: (logo: PartnerLogo) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, active: boolean) => void;
  dragHandleProps?: any;
}

export const PartnerLogoCard = ({
  logo,
  isSelected,
  showCheckbox,
  onSelect,
  onEdit,
  onDelete,
  onToggleActive,
  dragHandleProps,
}: PartnerLogoCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className={cn(
        "relative group transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection checkbox */}
      {showCheckbox && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect?.(logo.id, checked as boolean)}
          />
        </div>
      )}

      {/* Drag handle */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="absolute top-2 right-2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      {/* Logo preview */}
      <div
        className="relative aspect-[2/1] bg-muted flex items-center justify-center cursor-pointer rounded-t-lg overflow-hidden"
        onClick={() => onEdit?.(logo)}
      >
        {logo.logo_url ? (
          <img
            src={logo.logo_url}
            alt={logo.name}
            className="object-contain w-full h-full p-4"
          />
        ) : (
          <div className="text-muted-foreground text-sm">Pas de logo</div>
        )}

        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(logo);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(logo.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Logo info */}
      <div className="p-3 space-y-2">
        <p className="font-medium text-sm truncate" title={logo.name}>
          {logo.name || "Sans nom"}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Actif</span>
          <Switch
            checked={logo.is_active}
            onCheckedChange={(checked) => onToggleActive?.(logo.id, checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </Card>
  );
};
