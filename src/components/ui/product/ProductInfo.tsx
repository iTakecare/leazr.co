
import React from "react";
import { Product } from "@/types/catalog";

interface ProductInfoProps {
  product: Product;
}

const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  const productName = product?.name || "Produit sans nom";
  const productBrand = product?.brand || "";
  
  return (
    <>
      <h3 className="font-semibold text-lg mb-1 line-clamp-2 text-gray-900">{productName}</h3>
      {productBrand && <p className="text-sm text-gray-500 mb-2">{productBrand}</p>}
    </>
  );
};

export default ProductInfo;
