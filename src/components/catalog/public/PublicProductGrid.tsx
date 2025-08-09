import React from "react";
import { Product } from "@/types/catalog";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import ProductGridCardOptimized from "@/components/catalog/public/ProductGridCardOptimized";
import { useCompanyContext } from "@/context/CompanyContext";
import { generateProductSlug } from "@/lib/utils";
import { useSafeNavigate } from "@/hooks/useSafeNavigate";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { useLocation } from "react-router-dom";

interface PublicProductGridProps {
  products: Product[];
  onProductSelect?: (productId: string) => void;
}

const PublicProductGrid: React.FC<PublicProductGridProps> = ({ products, onProductSelect }) => {
  const safeNavigate = useSafeNavigate();
  const { navigateToClient } = useRoleNavigation();
  const { companyId, companySlug } = useCompanyContext();
  const location = useLocation();
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleProductClick = (product: Product) => {
    console.log('🎯 PUBLIC PRODUCT GRID - Product clicked:', {
      productId: product.id,
      productName: product.name,
      productBrand: product.brand,
      companySlug,
      companyId,
      currentPath: location.pathname
    });

    // If onProductSelect callback is provided, use it instead of navigation
    if (onProductSelect) {
      onProductSelect(product.id);
      return;
    }

    // Check if we're in client space - fix detection for multi-tenant URLs
    const isInClientSpace = location.pathname.includes('/client/');
    
    if (isInClientSpace) {
      // Navigate to client product detail page using role navigation
      const targetPath = `products/${product.id}`;
      console.log('🔗 CLIENT SPACE - Navigating to client product:', targetPath);
      navigateToClient(targetPath);
      return;
    }

    // Public space navigation (existing logic)
    const productSlug = product.slug || generateProductSlug(product.name, product.brand);
    console.log('🔗 Using product slug:', productSlug, product.slug ? '(pre-calculated)' : '(generated)');

    // Navigate based on context - slug-based takes priority with SEO-friendly URLs
    if (companySlug) {
      const targetUrl = `/${companySlug}/products/${productSlug}`;
      safeNavigate(targetUrl);
    } else if (companyId) {
      // Fallback to company-id-based URL with original format
      const targetUrl = `/public/${companyId}/products/${product.id}`;
      safeNavigate(targetUrl);
    } else {
      console.error('🎯 No valid navigation context found');
    }
  };

  if (!products) {
    console.error("PublicProductGrid: products prop is undefined");
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
    console.log("PublicProductGrid: empty products array");
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

  // Simplified logging for production

  return (
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
  );
};

export default PublicProductGrid;
