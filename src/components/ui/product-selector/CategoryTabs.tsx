
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
  // Assurons-nous que categories est bien un tableau de chaînes
  const normalizedCategories = React.useMemo(() => {
    return categories.map(category => {
      // Si c'est un objet (comme venant de la table categories), extraire le name
      if (typeof category === 'object' && category !== null) {
        return (category as any).name || '';
      }
      return category;
    }).filter(Boolean);
  }, [categories]);

  return (
    <TabsList className="w-auto inline-flex">
      <TabsTrigger 
        value="all" 
        onClick={() => setSelectedCategory("all")}
        className={selectedCategory === "all" ? "data-[state=active]" : ""}
      >
        Tous
      </TabsTrigger>
      {normalizedCategories.map((category) => (
        <TabsTrigger 
          key={category} 
          value={category} 
          onClick={() => setSelectedCategory(category)}
          className={selectedCategory === category ? "data-[state=active]" : ""}
        >
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </TabsTrigger>
      ))}
    </TabsList>
  );
};

export default CategoryTabs;
