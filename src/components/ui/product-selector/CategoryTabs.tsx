
import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CategoryTabsProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ 
  selectedCategory, 
  setSelectedCategory
}) => {
  return (
    <TabsList className="w-full flex flex-wrap overflow-x-auto">
      <TabsTrigger 
        value="all" 
        onClick={() => setSelectedCategory("all")}
        className={selectedCategory === "all" ? "data-[state=active]" : ""}
      >
        Tous les produits
      </TabsTrigger>
    </TabsList>
  );
};

export default CategoryTabs;
