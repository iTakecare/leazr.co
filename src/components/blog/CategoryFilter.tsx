
import React from "react";
import { Badge } from "@/components/ui/badge";

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="flex flex-wrap gap-2 py-4">
      <Badge 
        onClick={() => onCategoryChange(null)}
        className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          activeCategory === null
            ? "bg-[#48b5c3] text-white hover:bg-[#3da6b4]"
            : "bg-[#f8f8f6] text-gray-700 hover:bg-gray-200"
        }`}
      >
        Tous
      </Badge>
      
      {categories.map((category) => (
        <Badge 
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeCategory === category
              ? "bg-[#48b5c3] text-white hover:bg-[#3da6b4]"
              : "bg-[#f8f8f6] text-gray-700 hover:bg-gray-200"
          }`}
        >
          {category}
        </Badge>
      ))}
    </div>
  );
};

export default CategoryFilter;
