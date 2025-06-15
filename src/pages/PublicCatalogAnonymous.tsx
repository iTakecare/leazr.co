import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Laptop, Monitor, Smartphone, Printer, Star, ShoppingCart, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CompanyCustomizationService from "@/services/companyCustomizationService";

interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  price: number;
  monthly_price?: number;
  image_url?: string;
  admin_only?: boolean;
}

const PublicCatalogAnonymous = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tout");

  // Fetch company info with branding
  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      
      // Appliquer le branding personnalisé
      if (data && (data.primary_color || data.secondary_color || data.accent_color)) {
        CompanyCustomizationService.applyCompanyBranding({
          primary_color: data.primary_color || "#3b82f6",
          secondary_color: data.secondary_color || "#64748b",
          accent_color: data.accent_color || "#8b5cf6",
          logo_url: data.logo_url || ""
        });
      }
      
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch products for this company (public only)
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products", "public", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .or('admin_only.is.null,admin_only.eq.false')
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!companyId,
  });

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "Tout" || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Calculate categories
  const categories = [
    { name: "Tout", icon: Package, count: products.length },
    { name: "laptop", icon: Laptop, count: products.filter(p => p.category === "laptop").length },
    { name: "desktop", icon: Monitor, count: products.filter(p => p.category === "desktop").length },
    { name: "tablet", icon: Smartphone, count: products.filter(p => p.category === "tablet").length },
    { name: "printer", icon: Printer, count: products.filter(p => p.category === "printer").length }
  ];

  if (!companyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Entreprise non trouvée</h3>
            <p className="text-muted-foreground text-center">
              L'identifiant de l'entreprise est manquant ou invalide.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with company branding */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {company?.logo_url && (
              <img 
                src={company.logo_url} 
                alt={company.name}
                className="h-10 w-auto"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{company?.name || "Catalogue"}</h1>
              <p className="text-muted-foreground">Découvrez nos équipements disponibles</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Search bar */}
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

        {/* Category filters */}
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

        {/* Products grid */}
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
                    Demander un devis
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 text-muted-foreground">
          <p>© {new Date().getFullYear()} {company?.name}. Tous droits réservés.</p>
        </footer>
      </div>
    </div>
  );
};

export default PublicCatalogAnonymous;