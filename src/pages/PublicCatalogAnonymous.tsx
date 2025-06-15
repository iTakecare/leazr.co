import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Laptop, Monitor, Smartphone, Printer, Star, ShoppingCart, Search, Filter, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CompanyCustomizationService from "@/services/companyCustomizationService";
import CatalogHeader from "@/components/catalog/public/CatalogHeader";
import ProductGridCard from "@/components/catalog/public/ProductGridCard";
import { Product } from "@/types/catalog";

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
      <div className="container mx-auto p-6 space-y-6">
        {/* Hero Header */}
        <CatalogHeader />

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un produit, une marque..."
                className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtrer
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Trier par
              </Button>
            </div>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.name)}
                className="gap-2 rounded-full"
                size="sm"
              >
                <category.icon className="h-4 w-4" />
                {category.name === "Tout" ? "Tous les produits" : category.name}
                {category.count > 0 && (
                  <Badge variant="secondary" className="ml-1 rounded-full text-xs">
                    {category.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredProducts.map((product) => (
              <ProductGridCard
                key={product.id}
                product={product}
                onClick={() => {
                  // Navigate to product detail or open modal
                  console.log("Product clicked:", product);
                }}
              />
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