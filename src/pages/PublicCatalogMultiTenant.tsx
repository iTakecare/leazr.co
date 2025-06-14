import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Laptop, Monitor, Smartphone, Printer, Star, ShoppingCart, Search } from "lucide-react";
import { getProducts } from "@/services/catalogService";
import { useMultiTenant } from "@/hooks/useMultiTenant";

const PublicCatalogMultiTenant = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tout");
  const { companyId, loading: companyLoading } = useMultiTenant();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products", "public", companyId],
    queryFn: () => getProducts({ includeAdminOnly: false }),
    enabled: !companyLoading && !!companyId,
  });

  // Filtrer par recherche et catégorie
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "Tout" || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Calculer les catégories avec compteurs
  const categories = [
    { name: "Tout", icon: Package, count: products.length },
    { name: "laptop", icon: Laptop, count: products.filter(p => p.category === "laptop").length },
    { name: "desktop", icon: Monitor, count: products.filter(p => p.category === "desktop").length },
    { name: "tablet", icon: Smartphone, count: products.filter(p => p.category === "tablet").length },
    { name: "printer", icon: Printer, count: products.filter(p => p.category === "printer").length }
  ];

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catalogue</h1>
        <p className="text-muted-foreground">
          Découvrez notre sélection d'équipements disponibles en financement
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher un produit..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filtres par catégorie */}
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

      {/* Grille de produits */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-4">
                <div className="w-full h-48 bg-muted rounded-md"></div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
            <p className="text-muted-foreground text-center">
              Impossible de charger les produits. Veuillez réessayer.
            </p>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun produit trouvé</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery 
                ? "Aucun produit ne correspond à votre recherche."
                : "Aucun produit disponible dans cette catégorie."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="p-4">
                <div className="relative">
                  <img 
                    src={product.image_url || "/placeholder.svg"} 
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-md bg-muted"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                  {product.admin_only && (
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      Exclusif
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <CardTitle className="text-lg mb-1">{product.name}</CardTitle>
                <CardDescription className="text-sm mb-2">
                  {product.description || `${product.brand} - ${product.category}`}
                </CardDescription>
                
                <div className="flex items-center gap-1 mb-3">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">4.5</span>
                  <span className="text-sm text-muted-foreground">(12 avis)</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prix d'achat</span>
                    <span className="font-semibold">{product.price}€</span>
                  </div>
                  {product.monthly_price && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Financement</span>
                      <span className="font-semibold text-primary">{product.monthly_price}€/mois</span>
                    </div>
                  )}
                </div>

                <Button className="w-full gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Demander un financement
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicCatalogMultiTenant;