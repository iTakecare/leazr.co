
import React from "react";
import GroupingOptions from "./GroupingOptions";
import ViewModeToggle from "./ViewModeToggle";

interface ProductsViewOptionsProps {
  groupingOption: "model" | "brand";
  onGroupingChange: (option: "model" | "brand") => void;
  viewMode: "grid" | "accordion";
  onViewModeChange: (mode: "grid" | "accordion") => void;
}

const ProductsViewOptions: React.FC<ProductsViewOptionsProps> = ({
  groupingOption,
  onGroupingChange,
  viewMode,
  onViewModeChange
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 mb-4">
      <GroupingOptions 
        groupingOption={groupingOption} 
        onGroupingChange={onGroupingChange} 
      />
      
      <ViewModeToggle 
        viewMode={viewMode} 
        onChange={onViewModeChange} 
      />
    </div>
  );
};

export default ProductsViewOptions;
