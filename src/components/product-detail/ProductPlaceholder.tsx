
import React from "react";

interface ProductPlaceholderProps {
  altText: string;
}

const ProductPlaceholder: React.FC<ProductPlaceholderProps> = ({ altText }) => {
  return (
    <div className="flex flex-col-reverse md:flex-row md:gap-4">
      <div className="flex-1 relative">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md relative group">
          <div className="relative w-full aspect-square sm:aspect-[4/3] md:aspect-[3/2] flex items-center justify-center p-4">
            <div className="text-center text-gray-500">
              <img 
                src="/placeholder.svg"
                alt={altText}
                className="max-w-full max-h-full object-contain mx-auto"
              />
              <div className="mt-2 text-sm">Image non disponible</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPlaceholder;
