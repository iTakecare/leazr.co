import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Monitor, Laptop, Tablet, Smartphone, Apple, Plug, Printer, Disc, FileText, Globe, HardDrive, Server, X, List, Grid3X3 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface CatalogFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: Array<{name: string, translation: string, count: number}>;
  sortBy: string;
  sortOrder: string;
  onSortChange: (sortBy: string) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  viewMode: "grid" | "accordion";
  onViewModeChange: (mode: string) => void;
  groupingOption: "model" | "brand";
  onGroupingChange: (option: "model" | "brand") => void;
}

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  
  if (name.includes('desktop') || name.includes('bureau')) return Monitor;
  if (name.includes('laptop') || name.includes('portable')) return Laptop;
  if (name.includes('tablet') || name.includes('tablette')) return Tablet;
  if (name.includes('smartphone') || name.includes('mobile')) return Smartphone;
  if (name.includes('apple')) return Apple;
  if (name.includes('ecrans') || name.includes('écran') || name.includes('monitor')) return Monitor;
  if (name.includes('imprimante') || name.includes('printer')) return Printer;
  if (name.includes('logiciel') || name.includes('software')) return Disc;
  if (name.includes('bureautique') || name.includes('office')) return FileText;
  if (name.includes('réseau') || name.includes('network')) return Globe;
  if (name.includes('stockage') || name.includes('storage')) return HardDrive;
  if (name.includes('serveur') || name.includes('server')) return Server;
  if (name.includes('accessoire') || name.includes('accessories')) return Plug;
  
  return Plug; // Default icon
};

const CatalogFilterBar: React.FC<CatalogFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  sortBy,
  onSortChange,
  hasActiveFilters,
  onResetFilters,
  viewMode,
  onViewModeChange,
  groupingOption,
  onGroupingChange
}) => {
  return (
    <div className="bg-background border border-border rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
        {/* Barre de recherche */}
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Boutons catégories */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === "" ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange("")}
              className="whitespace-nowrap flex-shrink-0 rounded-full"
            >
              Tout
            </Button>
            {categories.map((category) => {
              const IconComponent = getCategoryIcon(category.name);
              return (
                <Button
                  key={category.name}
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => onCategoryChange(category.name)}
                  className="whitespace-nowrap flex-shrink-0 rounded-full gap-2"
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{category.translation}</span>
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs ml-1">
                    {category.count}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Options de vue et groupement */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Groupement */}
          <div className="flex space-x-1 bg-muted p-1 rounded-md">
            <Button 
              variant={groupingOption === "model" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => onGroupingChange("model")}
              className="rounded-md text-xs"
            >
              Par modèle
            </Button>
            <Button 
              variant={groupingOption === "brand" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => onGroupingChange("brand")}
              className="rounded-md text-xs"
            >
              Par marque
            </Button>
          </div>

          {/* Mode de vue */}
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={onViewModeChange}
            className="bg-background"
          >
            <ToggleGroupItem value="accordion" aria-label="Voir en liste" size="sm">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Voir en grille" size="sm">
              <Grid3X3 className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Tri */}
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Plus récent</SelectItem>
              <SelectItem value="name">Nom A-Z</SelectItem>
              <SelectItem value="price">Prix croissant</SelectItem>
              <SelectItem value="brand">Marque A-Z</SelectItem>
            </SelectContent>
          </Select>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogFilterBar;