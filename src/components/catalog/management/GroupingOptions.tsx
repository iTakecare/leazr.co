
import React from "react";
import { Button } from "@/components/ui/button";

interface GroupingOptionsProps {
  groupingOption: "model" | "brand";
  onGroupingChange: (option: "model" | "brand") => void;
}

const GroupingOptions: React.FC<GroupingOptionsProps> = ({ 
  groupingOption, 
  onGroupingChange 
}) => {
  return (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-md w-full sm:w-auto">
      <Button 
        variant={groupingOption === "model" ? "secondary" : "ghost"} 
        size="sm"
        onClick={() => onGroupingChange("model")}
        className="rounded-md flex-1 sm:flex-initial"
      >
        Par modèle
      </Button>
      <Button 
        variant={groupingOption === "brand" ? "secondary" : "ghost"} 
        size="sm"
        onClick={() => onGroupingChange("brand")}
        className="rounded-md flex-1 sm:flex-initial"
      >
        Par marque
      </Button>
    </div>
  );
};

export default GroupingOptions;
