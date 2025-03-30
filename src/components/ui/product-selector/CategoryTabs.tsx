
import React from "react";
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";

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
    <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
      <TabsList className="w-auto inline-flex">
        <TabsTrigger value="all">Tous</TabsTrigger>
        {categories.map(category => (
          <TabsTrigger key={category} value={category}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default CategoryTabs;
