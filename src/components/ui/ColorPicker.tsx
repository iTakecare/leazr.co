
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PaintBucket } from "lucide-react";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker = ({ color, onChange }: ColorPickerProps) => {
  const [currentColor, setCurrentColor] = useState(color || "#000000");
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentColor(e.target.value);
    onChange(e.target.value);
  };

  // Prédéfinir des couleurs communes
  const presetColors = [
    "#000000", "#FFFFFF", "#F44336", "#E91E63", "#9C27B0", 
    "#673AB7", "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4", 
    "#009688", "#4CAF50", "#8BC34A", "#CDDC39", "#FFEB3B", 
    "#FFC107", "#FF9800", "#FF5722", "#795548", "#607D8B"
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between"
        >
          <div className="flex items-center">
            <div 
              className="h-4 w-4 rounded-sm mr-2 border border-gray-300" 
              style={{ backgroundColor: currentColor }}
            />
            {currentColor}
          </div>
          <PaintBucket className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-4">
          <div>
            <Label htmlFor="color-input">Choisir une couleur</Label>
            <div className="flex mt-1.5">
              <div 
                className="h-9 w-9 rounded-l-md border border-r-0 border-input flex items-center justify-center"
                style={{ backgroundColor: currentColor }}
              />
              <Input
                id="color-input"
                type="color"
                value={currentColor}
                onChange={handleColorChange}
                className="w-full border-l-0 rounded-l-none"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="color-hex">Code hexadécimal</Label>
            <Input
              id="color-hex"
              value={currentColor}
              onChange={(e) => {
                // Validation simple pour s'assurer que c'est un code hexadécimal valide
                if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(e.target.value)) {
                  setCurrentColor(e.target.value);
                  onChange(e.target.value);
                }
              }}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Couleurs prédéfinies</Label>
            <div className="grid grid-cols-5 gap-2 mt-1.5">
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`h-6 w-6 rounded-sm border ${
                    currentColor === presetColor ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => {
                    setCurrentColor(presetColor);
                    onChange(presetColor);
                  }}
                  aria-label={`Sélectionner la couleur ${presetColor}`}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ColorPicker;
