
import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Category } from "@/types/catalog";

interface CategoryTabsProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: (string | Category)[];
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ 
  selectedCategory, 
  setSelectedCategory, 
  categories 
}) => {
  // Function to handle category value and display
  const getCategoryValue = (category: string | Category): string => {
    if (typeof category === 'string') {
      return category;
    }
    return category.name || '';
  };
  
  // Function to get display name
  const getCategoryDisplayName = (category: string | Category): string => {
    if (typeof category === 'string') {
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
    return category.translation || category.name || 'Catégorie';
  };

  return (
    <TabsList className="w-full flex flex-wrap overflow-x-auto">
      <TabsTrigger 
        value="all" 
        onClick={() => setSelectedCategory("all")}
        className={selectedCategory === "all" ? "data-[state=active]" : ""}
      >
        Tous
      </TabsTrigger>
      
      {categories.map((category) => {
        const value = getCategoryValue(category);
        return (
          <TabsTrigger 
            key={value} 
            value={value} 
            onClick={() => setSelectedCategory(value)}
            className={selectedCategory === value ? "data-[state=active]" : ""}
          >
            {getCategoryDisplayName(category)}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
};

export default CategoryTabs;
