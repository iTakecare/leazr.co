
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getProducts } from "@/services/catalogService";
import { formatCurrency } from "@/utils/formatters";
import { Star, Package } from "lucide-react";

interface RelatedProductsProps {
  category: string;
  currentProductId: string;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ category, currentProductId }) => {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products", { category }],
    queryFn: async () => {
      // Get all products and filter by category
      const allProducts = await getProducts({ includeAdminOnly: true });
      return allProducts.filter(product => product.category === category);
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 animate-pulse h-64 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (error || !products || products.length === 0) {
    return null;
  }

  // Filter out the current product and limit to 4 related products
  const relatedProducts = products
    .filter(product => product.id !== currentProductId)
    .slice(0, 4);

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-indigo-900 inline-block relative">
          <span className="relative z-10">Produits similaires</span>
          <span className="absolute bottom-1 left-0 w-full h-2 bg-indigo-100 rounded -z-0"></span>
        </h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {relatedProducts.map((product) => (
          <Link 
            to={`/products/${product.id}`} 
            key={product.id}
            className="group bg-white overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 transform hover:-translate-y-1 flex flex-col"
          >
            <div className="aspect-square p-6 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute top-2 right-2 bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                {product.category === "laptop" ? "Ordinateur" : product.category}
              </div>
              <img 
                src={product.image_url || "/placeholder.svg"} 
                alt={product.name} 
                className="h-32 object-contain relative z-10 transition-transform group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
            <div className="p-4 flex flex-col flex-grow">
              {product.brand && (
                <div className="text-xs font-medium text-indigo-600 mb-1">{product.brand}</div>
              )}
              <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 flex-grow">{product.name}</h3>
              <div className="flex items-center mb-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <span className="text-xs text-gray-500 ml-1">(5.0)</span>
              </div>
              <div className="text-lg font-bold text-indigo-700 flex items-center">
                {product.monthly_price ? 
                  formatCurrency(product.monthly_price) : 
                  <Package className="h-4 w-4 mr-1" />}
                <span>{product.monthly_price ? "/mois" : "Sur demande"}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
