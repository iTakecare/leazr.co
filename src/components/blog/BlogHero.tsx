
import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BlogHeroProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categories: { category: string; count: number }[];
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

const BlogHero = ({ 
  searchQuery, 
  setSearchQuery, 
  categories, 
  activeCategory, 
  onCategoryChange 
}: BlogHeroProps) => {
  return (
    <div className="bg-[#f8f8f6] py-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#222222]">
            Notre Blog
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Découvrez nos derniers articles, conseils et nouvelles du monde de l'IT et du leasing de matériel reconditionné.
          </p>
          
          <div className="relative mb-8">
            <Input
              type="text"
              placeholder="Rechercher un article..."
              className="pl-10 py-6 rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            <Badge
              variant={activeCategory === null ? "default" : "outline"}
              className={`px-4 py-2 cursor-pointer ${
                activeCategory === null
                  ? "bg-[#48b5c3] text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => onCategoryChange(null)}
            >
              Tous
            </Badge>
            
            {categories.map((cat) => (
              <Badge
                key={cat.category}
                variant={activeCategory === cat.category ? "default" : "outline"}
                className={`px-4 py-2 cursor-pointer ${
                  activeCategory === cat.category
                    ? "bg-[#48b5c3] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => onCategoryChange(cat.category)}
              >
                {cat.category} ({cat.count})
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogHero;
