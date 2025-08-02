import React, { useState } from "react";
import { Product } from "@/types/catalog";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import ProductGridCardOptimized from "@/components/catalog/public/ProductGridCardOptimized";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { useLocation, useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PublicProductDetail from "@/components/public/PublicProductDetail";

interface ClientProductGridProps {
  products: Product[];
}

const ClientProductGrid: React.FC<ClientProductGridProps> = ({ products }) => {
  const { navigateToClient } = useRoleNavigation();
  const location = useLocation();
  const { companySlug } = useParams<{ companySlug: string }>();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleProductClick = (product: Product) => {
    console.log('🎯 CLIENT PRODUCT GRID - Product clicked:', {
      productId: product.id,
      productName: product.name,
      currentPath: location.pathname
    });

    // Open modal with product details instead of navigating
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  if (!products) {
    console.error("ClientProductGrid: products prop is undefined");
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucun produit trouvé</p>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Une erreur s'est produite lors du chargement des produits
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    console.log("ClientProductGrid: empty products array");
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucun produit trouvé</p>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Le catalogue est actuellement vide
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {products.map((product) => (
          <motion.div key={product.id} variants={itemVariants}>
            <ProductGridCardOptimized 
              product={product} 
              onClick={() => handleProductClick(product)}
            />
          </motion.div>
        ))}
      </div>

      {/* Product Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedProduct?.name || "Détails du produit"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            {selectedProduct && companySlug && (
              <PublicProductDetail
                companyId={selectedProduct.company_id || ""}
                companySlug={companySlug}
                productId={selectedProduct.id}
                company={{
                  id: selectedProduct.company_id || "",
                  name: "",
                  slug: companySlug,
                  logo_url: ""
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientProductGrid;