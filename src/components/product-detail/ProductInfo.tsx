
import React from "react";
import { Product } from "@/types/catalog";
import { Badge } from "@/components/ui/badge";
import { StarIcon, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ProductInfoProps {
  product: Product;
}

const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
            {product.category}
          </Badge>
          {product.brand && (
            <Badge variant="outline" className="bg-gray-50">
              {product.brand}
            </Badge>
          )}
          
          <div className="flex items-center text-amber-500">
            <StarIcon className="fill-amber-500 h-4 w-4" />
            <StarIcon className="fill-amber-500 h-4 w-4" />
            <StarIcon className="fill-amber-500 h-4 w-4" />
            <StarIcon className="fill-amber-500 h-4 w-4" />
            <StarIcon className="fill-amber-500 h-4 w-4 opacity-40" />
          </div>
        </div>
      </div>
      
      <div>
        <p className="text-gray-700">{product.description}</p>
      </div>
      
      <div className="bg-green-50 p-3 rounded-lg border border-green-100">
        <div className="flex items-start">
          <ShieldCheck className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-800">Matériel reconditionné de qualité</h3>
            <p className="text-sm text-green-700">
              Vérifié, nettoyé, et couvert par notre garantie pendant toute la durée du contrat.
            </p>
          </div>
        </div>
      </div>
      
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="font-medium mb-2 text-gray-900">Caractéristiques principales</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(product.specifications).map(([key, value]) => (
                <li key={key} className="text-sm">
                  <span className="text-gray-500">{key}: </span>
                  <span className="font-medium">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductInfo;
