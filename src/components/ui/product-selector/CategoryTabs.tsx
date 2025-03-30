
import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CategoryTabsProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: string[];
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ 
  selectedCategory, 
  setSelectedCategory, 
  categories 
}) => {
  return (
    <TabsList className="w-full flex flex-wrap overflow-x-auto">
      <TabsTrigger 
        value="all" 
        onClick={() => setSelectedCategory("all")}
        className={selectedCategory === "all" ? "data-[state=active]" : ""}
      >
        Tous
      </TabsTrigger>
      
      {categories.map((category) => (
        <TabsTrigger 
          key={category} 
          value={category} 
          onClick={() => setSelectedCategory(category)}
          className={selectedCategory === category ? "data-[state=active]" : ""}
        >
          {typeof category === 'string' ? 
            category.charAt(0).toUpperCase() + category.slice(1) : 
            'Catégorie'}
        </TabsTrigger>
      ))}
    </TabsList>
  );
};

export default CategoryTabs;
