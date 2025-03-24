
import React from "react";
import { Input } from "@/components/ui/input";

interface ColorPickerProps {
  id?: string;
  value: string;
  onColorChange: (color: string) => void;
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  id, 
  value, 
  onColorChange, 
  className 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Input 
        type="color" 
        id={id} 
        value={value} 
        onChange={(e) => onColorChange(e.target.value)} 
        className="w-12 h-10 p-1 cursor-pointer" 
      />
      <Input 
        type="text"
        value={value}
        onChange={(e) => onColorChange(e.target.value)}
        placeholder="#000000"
        className="flex-1"
      />
    </div>
  );
};
