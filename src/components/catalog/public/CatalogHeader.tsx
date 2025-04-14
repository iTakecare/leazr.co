
import React from "react";
import Container from "@/components/layout/Container";

interface CatalogHeaderProps {
  title?: string;
  description?: string;
}

const CatalogHeader: React.FC<CatalogHeaderProps> = ({ 
  title = "Catalogue de produits", 
  description = "Parcourez notre sélection d'équipements reconditionnés pour votre entreprise" 
}) => {
  return (
    <Container maxWidth="full" className="mb-8 bg-gradient-to-r from-blue-50/50 to-slate-50/50 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-3">{title}</h1>
        <p className="text-muted-foreground text-base md:text-lg">
          {description}
        </p>
      </div>
    </Container>
  );
};

export default CatalogHeader;
