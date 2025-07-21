
import React from "react";
import { Badge } from "@/components/ui/badge";

interface Category {
  name: string;
  translation: string;
  count: number;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onChange: (category: string | null) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onChange
}) => {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-foreground">Catégories</h3>
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedCategory === null ? "default" : "outline"}
          className="cursor-pointer transition-all hover:scale-105"
          onClick={() => onChange(null)}
        >
          Toutes
        </Badge>
        {categories.map((category) => (
          <Badge
            key={category.name}
            variant={selectedCategory === category.name ? "default" : "outline"}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => onChange(category.name)}
          >
            {category.translation}
            <span className="ml-1 text-xs opacity-70">({category.count})</span>
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
