
import React, { useState, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Product, products } from "@/data/products";
import { motion } from "framer-motion";

interface ProductCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

const ProductCatalog = ({ isOpen, onClose, onSelectProduct }: ProductCatalogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  
  useEffect(() => {
    const uniqueCategories = new Set<string>();
    products.forEach(product => {
      if (product.category) {
        uniqueCategories.add(product.category);
      }
    });
    setCategories(["all", ...Array.from(uniqueCategories)]);
  }, []);
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const handleSelectProduct = (product: Product) => {
    onSelectProduct(product);
    onClose();
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg">
        <SheetHeader>
          <SheetTitle>Catalogue de produits</SheetTitle>
          <SheetDescription>
            Sélectionnez un produit pour l'ajouter à votre offre
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category === "all" ? "Tous" : category}
              </Button>
            ))}
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                whileHover={{ y: -5 }}
                className="border rounded-lg p-4 cursor-pointer hover:border-primary"
                onClick={() => handleSelectProduct(product)}
              >
                <div className="aspect-square w-full overflow-hidden bg-muted mb-3 rounded-md">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.category}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-bold">
                    {product.price.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </p>
                  <Button size="sm" variant="ghost" className="rounded-full h-8 w-8 p-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
            
            {filteredProducts.length === 0 && (
              <div className="col-span-2 py-8 text-center">
                <p className="text-muted-foreground">Aucun produit trouvé</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductCatalog;
