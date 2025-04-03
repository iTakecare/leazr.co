
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <Tabs 
      value={selectedCategory} 
      onValueChange={setSelectedCategory}
      className="flex-1 flex flex-col overflow-hidden"
    >
      <div className="px-4 py-2 border-b overflow-x-auto">
        <TabsList className="w-auto inline-flex">
          <TabsTrigger value="all">Tous</TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value={selectedCategory} className="flex-1 h-full">
        {/* Content will be placed by parent component */}
      </TabsContent>
    </Tabs>
  );
};

export default CategoryTabs;
