
import React from "react";
import { useLocation } from "react-router-dom";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import { Container } from "@/components/ui/container";
import ProductCatalogGrid from "@/components/catalog/ProductCatalogGrid";

const PublicCatalog = () => {
  const location = useLocation();
  const isClientDashboard = location.pathname.startsWith('/client/');

  return (
    <div className="min-h-screen bg-white">
      {!isClientDashboard && <PublicHeader />}
      <div className="pt-8 pb-16">
        <Container>
          <h1 className="text-2xl md:text-3xl font-bold mb-8">Catalogue Produits</h1>
          <ProductCatalogGrid />
        </Container>
      </div>
    </div>
  );
};

export default PublicCatalog;
