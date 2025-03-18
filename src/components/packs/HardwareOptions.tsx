
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Laptop, Monitor, Smartphone, Tablet } from "lucide-react";

interface HardwareOptionsProps {
  options: {
    laptop: string[];
    desktop: string[];
    mobile: string[];
    tablet: string[];
  };
  selectedHardware: {
    laptop: string | null;
    desktop: string | null;
    mobile: string | null;
    tablet: string | null;
  };
  onSelect: (category: string, option: string) => void;
}

const HardwareOptions: React.FC<HardwareOptionsProps> = ({ options, selectedHardware, onSelect }) => {
  const categories = [
    {
      id: "laptop",
      label: "Ordinateur portable",
      icon: <Laptop className="h-5 w-5" />,
      options: options.laptop,
    },
    {
      id: "desktop",
      label: "Ordinateur fixe",
      icon: <Monitor className="h-5 w-5" />,
      options: options.desktop,
    },
    {
      id: "mobile",
      label: "Smartphone",
      icon: <Smartphone className="h-5 w-5" />,
      options: options.mobile,
    },
    {
      id: "tablet",
      label: "Tablette",
      icon: <Tablet className="h-5 w-5" />,
      options: options.tablet,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {categories.map((category) => (
        <Card key={category.id} className="overflow-hidden">
          <div className="bg-gray-50 p-4 flex items-center space-x-3 border-b">
            {category.icon}
            <h3 className="font-medium">{category.label}</h3>
          </div>
          <CardContent className="p-4">
            {category.options.length > 0 ? (
              <RadioGroup
                value={selectedHardware[category.id as keyof typeof selectedHardware] || ""}
                onValueChange={(value) => onSelect(category.id, value)}
              >
                <div className="space-y-3">
                  {category.options.map((option, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <RadioGroupItem value={option} id={`${category.id}-${index}`} />
                      <Label htmlFor={`${category.id}-${index}`} className="text-sm leading-snug cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            ) : (
              <div className="text-sm text-gray-500 italic p-2">Aucune option disponible</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default HardwareOptions;
