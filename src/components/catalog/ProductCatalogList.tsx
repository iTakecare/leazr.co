
import React from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Edit, 
  Tag as TagIcon, 
  Layers 
} from "lucide-react";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";

interface ProductListProps {
  products: Product[];
  getProductImage: (product: Product) => string;
  getVariantsForProduct: (productId: string) => Product[];
  isVariantGroupExpanded: (productId: string) => boolean;
  toggleVariantGroup: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  hasVariantSupport: boolean;
  editMode?: boolean;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  getProductImage,
  getVariantsForProduct,
  isVariantGroupExpanded,
  toggleVariantGroup,
  onSelectProduct,
  hasVariantSupport,
  editMode = false
}) => {
  const renderProductRow = (product: Product, isChildVariant = false) => (
    <div
      key={product.id}
      className={`py-4 flex gap-4 hover:bg-gray-50 cursor-pointer transition-colors rounded-lg px-3 ${
        isChildVariant ? 'bg-purple-50' : ''
      }`}
      onClick={() => onSelectProduct(product)}
    >
      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden relative">
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.name || "Produit"}
          className="w-full h-full object-contain p-2"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
            console.log(`Erreur d'image dans la liste pour ${product.name || 'produit inconnu'}`);
          }}
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">{product.brand || "Brand"}</div>
              {product.parent_id && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                  Variante
                </span>
              )}
            </div>
            <h3 className="font-medium text-gray-900">{product.name || "Produit"}</h3>
            
            {hasVariantSupport && product.parent_id && product.selected_attributes && Object.keys(product.selected_attributes || {}).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
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
            
            {product.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-1">{product.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-blue-600">
              {formatCurrency(product.monthly_price || 0)}
              <span className="text-gray-500 font-normal"> /mois</span>
            </div>
            <div className="text-xs text-gray-500">
              Prix d'achat: {formatCurrency(product.price || 0)}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center">
        {editMode ? (
          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
            <Edit className="h-5 w-5" />
          </button>
        ) : (
          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
            <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="divide-y divide-gray-200">
      {products.map((product) => {
        const isParent = hasVariantSupport && (product.is_parent || (product.variant_combination_prices && product.variant_combination_prices.length > 0));
        const variantsCount = isParent ? (getVariantsForProduct(product.id || "").length || product.variants?.length || 0) : 0;
        const variants = isParent && isVariantGroupExpanded(product.id || "") ? getVariantsForProduct(product.id || "") : [];
        
        return (
          <div key={product.id} className="border-b border-gray-200 last:border-b-0">
            <div className="relative">
              {renderProductRow(product)}
              
              {isParent && variantsCount > 0 && (
                <button
                  className="absolute top-1/2 -translate-y-1/2 right-16 px-2 py-1 bg-purple-100 rounded-full text-xs font-medium text-purple-700 flex items-center gap-1 hover:bg-purple-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (product.id) {
                      toggleVariantGroup(product.id);
                    }
                  }}
                >
                  <Layers className="h-3 w-3" />
                  {variantsCount} variante{variantsCount > 1 ? 's' : ''}
                  {isVariantGroupExpanded(product.id || "") ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>
            
            {isParent && isVariantGroupExpanded(product.id || "") && variants.length > 0 && (
              <div className="pl-6 border-l-2 border-purple-200 ml-4">
                {variants.map(variant => renderProductRow(variant, true))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProductList;
