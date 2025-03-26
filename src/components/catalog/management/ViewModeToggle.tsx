
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { List, Grid3X3 } from "lucide-react";

interface ViewModeToggleProps {
  viewMode: "grid" | "accordion";
  onChange: (value: string) => void;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ viewMode, onChange }) => {
  return (
    <div className="flex items-center space-x-2 self-end">
      <ToggleGroup 
        type="single" 
        value={viewMode} 
        onValueChange={onChange}
        className="bg-background"
      >
        <ToggleGroupItem value="accordion" aria-label="Voir en liste">
          <List className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="grid" aria-label="Voir en grille">
          <Grid3X3 className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default ViewModeToggle;
