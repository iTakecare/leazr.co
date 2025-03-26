
import React from "react";

interface ProductSpecificationsTableProps {
  specifications: Record<string, string | number>;
}

const ProductSpecificationsTable: React.FC<ProductSpecificationsTableProps> = ({ specifications }) => {
  if (Object.keys(specifications).length === 0) {
    return null;
  }
  
  return (
    <div className="mb-6">
      <h3 className="text-xl font-medium mb-3">Caractéristiques</h3>
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px text-sm">
          {Object.entries(specifications).map(([key, value], index) => (
            <div key={key} className={`p-3 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
              <span className="font-medium capitalize mr-1">{key}:</span>
              <span className="text-gray-700">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductSpecificationsTable;
