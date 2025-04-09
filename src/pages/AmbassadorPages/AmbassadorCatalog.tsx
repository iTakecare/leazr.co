import React from "react";
import Container from "@/components/layout/Container";
import ProductGrid from "@/components/catalog/ProductGrid";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import { Skeleton } from "@/components/ui/skeleton";

const AmbassadorCatalog = () => {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "ambassador"],
    queryFn: () => getProducts(true), // true inclut les produits admin_only
  });

  if (isLoading) {
    return (
      <Container>
        <div className="py-8">
          <div className="flex items-center mb-6">
            <Skeleton className="h-5 w-24" />
          </div>
          <ProductGrid
            products={[
              {
                id: "1",
                name: "Loading...",
                brand: "Loading...",
                category: "Loading...",
                description: "Loading...",
                price: 0,
                imageUrl: "/placeholder.svg",
                createdAt: new Date(),
                updatedAt: new Date(),
                active: true,
              },
            ]}
          />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-8">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-bold">Catalogue Ambassadeur</h1>
        </div>
        <ProductGrid products={products} />
      </div>
    </Container>
  );
};

export default AmbassadorCatalog;
