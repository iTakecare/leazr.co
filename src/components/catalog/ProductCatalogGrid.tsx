
import React from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Edit, 
  Tag as TagIcon 
} from "lucide-react";
import { Product } from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";

interface ProductGridProps {
  products: Product[];
  getProductImage: (product: Product) => string;
  getVariantsForProduct: (productId: string) => Product[];
  isVariantGroupExpanded: (productId: string) => boolean;
  toggleVariantGroup: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  hasVariantSupport: boolean;
  editMode?: boolean;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  getProductImage,
  getVariantsForProduct,
  isVariantGroupExpanded,
  toggleVariantGroup,
  onSelectProduct,
  hasVariantSupport,
  editMode = false
}) => {
  const renderProductCard = (product: Product, isChildVariant = false) => (
    <div
      key={product.id}
      className={`bg-white rounded-lg border overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative ${
        isChildVariant ? 'border-purple-200 bg-purple-50' : 'border-gray-200'
      }`}
      onClick={() => onSelectProduct(product)}
    >
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {editMode && (
          <button 
            className="p-1.5 rounded-full bg-white shadow-sm text-blue-600 hover:bg-blue-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onSelectProduct(product);
            }}
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
        
        {product.parent_id && (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
            Variante
          </span>
        )}
      </div>
      
      <div className="h-48 overflow-hidden bg-gray-100 relative">
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.name || "Produit"}
          className="w-full h-full object-contain p-4 transition-transform group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
            console.log(`Fallback à l'image par défaut pour ${product.name || 'produit inconnu'}`);
          }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
      
      <div className="p-4">
        <div className="text-xs text-gray-500 mb-1">{product.brand || "Brand"}</div>
        <h3 className="font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
          {product.name || "Produit"}
        </h3>
        
        {hasVariantSupport && product.parent_id && product.selected_attributes && Object.keys(product.selected_attributes || {}).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.entries(product.selected_attributes || {}).map(([key, value], idx) => (
              <span 
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
              >
                <TagIcon className="h-3 w-3" />
                {key}: {String(value)}
              </span>
            ))}
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <span className="text-gray-600">dès </span>
            <span className="font-semibold text-blue-600">
              {formatCurrency(product.monthly_price || 0)}
            </span>
            <span className="text-gray-600"> par mois</span>
          </div>
          <button className="p-1.5 rounded-full bg-blue-100 text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">
            {editMode ? <Edit className="h-4 w-4" /> : <span>+</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map(product => {
        const isParent = hasVariantSupport && (product.is_parent || (product.variant_combination_prices && product.variant_combination_prices.length > 0));
        const variantsCount = isParent ? (getVariantsForProduct(product.id || "").length || product.variants?.length || 0) : 0;
        const variants = isParent && isVariantGroupExpanded(product.id || "") ? getVariantsForProduct(product.id || "") : [];
        
        return (
          <div key={product.id} className="space-y-2">
            <div className="relative">
              {renderProductCard(product)}
              
              {isParent && variantsCount > 0 && (
                <button
                  className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 rounded-full text-xs font-medium text-purple-700 flex items-center gap-1 shadow-sm hover:bg-purple-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (product.id) {
                      toggleVariantGroup(product.id);
                    }
                  }}
                >
                  <Layers className="h-3 w-3" />
                  {isVariantGroupExpanded(product.id || "") ? 'Masquer' : 'Voir'} les variantes ({variantsCount})
                </button>
              )}
            </div>
            
            {isParent && isVariantGroupExpanded(product.id || "") && variants.length > 0 && (
              <div className="pl-4 border-l-2 border-purple-200 space-y-2">
                {variants.map(variant => (
                  <div key={variant.id}>
                    {renderProductCard(variant, true)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProductGrid;
