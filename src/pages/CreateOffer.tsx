
import React, { useState } from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Product, products, getProductCategories } from "@/data/products";
import ProductCard from "@/components/ui/ProductCard";
import OfferCalculator from "@/components/ui/OfferCalculator";
import CommissionDisplay from "@/components/ui/CommissionDisplay";
import { Search, Filter, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";

const CreateOffer = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  
  const categories = ["all", ...getProductCategories()];
  
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const handleSelectProduct = (product: Product) => {
    const isAlreadySelected = selectedProducts.some((p) => p.id === product.id);
    
    if (isAlreadySelected) {
      setSelectedProducts(selectedProducts.filter((p) => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };
  
  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <PageTransition>
      <Container>
        <motion.div
          className="py-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Créer une offre
            </h1>
            <p className="text-muted-foreground">
              Sélectionnez les produits et configurez votre offre
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            <motion.div variants={itemVariants} className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sélection des produits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher un produit..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>

                    <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
                      <TabsList className="w-full h-auto flex flex-wrap overflow-x-auto">
                        {categories.map((category) => (
                          <TabsTrigger
                            key={category}
                            value={category}
                            className="flex-shrink-0"
                          >
                            {category === "all" ? "Tous" : category}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      <div className="mt-4">
                        {filteredProducts.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <LayoutGrid className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">
                              Aucun produit trouvé
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredProducts.map((product) => (
                              <ProductCard
                                key={product.id}
                                product={product}
                                onSelect={handleSelectProduct}
                                isSelected={selectedProducts.some(
                                  (p) => p.id === product.id
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-6">
              <OfferCalculator
                selectedProducts={selectedProducts}
                onRemoveProduct={handleRemoveProduct}
              />
              <CommissionDisplay />
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default CreateOffer;
