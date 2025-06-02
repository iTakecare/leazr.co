
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Laptop, Monitor, Smartphone, Printer, Star, ShoppingCart } from "lucide-react";

const PublicCatalog = () => {
  // Mock data for demonstration
  const products = [
    {
      id: "1",
      name: "MacBook Pro M3 16'",
      category: "Ordinateurs portables",
      price: "2,499€",
      monthlyPrice: "104€/mois",
      rating: 4.8,
      image: "/lovable-uploads/0a5c4464-b8ea-42d5-a130-4c365fcd00ae.png",
      description: "Processeur M3, 16GB RAM, 512GB SSD",
      badge: "Populaire"
    },
    {
      id: "2",
      name: "Dell XPS 13",
      category: "Ordinateurs portables",
      price: "1,299€",
      monthlyPrice: "54€/mois",
      rating: 4.6,
      image: "/lovable-uploads/1aa14a0c-93f6-43b7-acbc-d219bbd9c46e.png",
      description: "Intel Core i7, 16GB RAM, 256GB SSD",
      badge: "Nouveau"
    },
    {
      id: "3",
      name: "iMac 24' M3",
      category: "Ordinateurs de bureau",
      price: "1,899€",
      monthlyPrice: "79€/mois",
      rating: 4.7,
      image: "/lovable-uploads/273e8a35-7b57-42b0-b601-382d95b1baaa.png",
      description: "Écran Retina 4.5K, M3, 8GB RAM",
      badge: ""
    },
    {
      id: "4",
      name: "iPad Pro 12.9'",
      category: "Tablettes",
      price: "1,199€",
      monthlyPrice: "50€/mois",
      rating: 4.5,
      image: "/lovable-uploads/2e1ccff5-5bca-4d24-a2ea-df65fdb5d9a3.png",
      description: "M2, 128GB, Wi-Fi + Cellular",
      badge: ""
    }
  ];

  const categories = [
    { name: "Tout", icon: Package, count: products.length },
    { name: "Ordinateurs portables", icon: Laptop, count: 2 },
    { name: "Ordinateurs de bureau", icon: Monitor, count: 1 },
    { name: "Tablettes", icon: Smartphone, count: 1 },
    { name: "Imprimantes", icon: Printer, count: 0 }
  ];

  const [selectedCategory, setSelectedCategory] = React.useState("Tout");

  const filteredProducts = selectedCategory === "Tout" 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catalogue</h1>
        <p className="text-muted-foreground">
          Découvrez notre sélection d'équipements disponibles en financement
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.name}
            variant={selectedCategory === category.name ? "default" : "outline"}
            onClick={() => setSelectedCategory(category.name)}
            className="gap-2"
          >
            <category.icon className="h-4 w-4" />
            {category.name}
            <Badge variant="secondary" className="ml-1">
              {category.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="p-4">
              <div className="relative">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-md bg-gray-100"
                />
                {product.badge && (
                  <Badge 
                    className="absolute top-2 right-2"
                    variant={product.badge === "Populaire" ? "default" : "secondary"}
                  >
                    {product.badge}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <CardTitle className="text-lg mb-1">{product.name}</CardTitle>
              <CardDescription className="text-sm mb-2">
                {product.description}
              </CardDescription>
              
              <div className="flex items-center gap-1 mb-3">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{product.rating}</span>
                <span className="text-sm text-muted-foreground">({Math.floor(Math.random() * 100) + 20} avis)</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Prix d'achat</span>
                  <span className="font-semibold">{product.price}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Financement</span>
                  <span className="font-semibold text-blue-600">{product.monthlyPrice}</span>
                </div>
              </div>

              <Button className="w-full gap-2">
                <ShoppingCart className="h-4 w-4" />
                Demander un financement
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun produit trouvé</h3>
            <p className="text-muted-foreground text-center">
              Aucun produit ne correspond à cette catégorie pour le moment.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PublicCatalog;
