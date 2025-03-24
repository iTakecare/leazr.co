
import React from 'react';
import { Input } from './input';
import { Label } from './label';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  value, 
  onChange, 
  label,
  className = ""
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <Label htmlFor="color-picker">{label}</Label>}
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 p-1 cursor-pointer"
          id="color-picker"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
      </div>
    </div>
  );
};

export default ColorPicker;
