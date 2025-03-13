
import React from 'react';
import { Tag, Check, AlertCircle, ImageIcon } from 'lucide-react';

interface ImportStatisticsProps {
  productsCount: number;
  successCount: number;
  errorCount: number;
  importedImages: number;
  includeImages: boolean;
  completed: boolean;
}

const ImportStatistics: React.FC<ImportStatisticsProps> = ({
  productsCount,
  successCount,
  errorCount,
  importedImages,
  includeImages,
  completed
}) => {
  if (productsCount === 0) return null;
  
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-700">Produits: <strong>{productsCount}</strong></span>
        </div>
        
        {completed && (
          <>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-700">Importés: <strong>{successCount}</strong></span>
            </div>
            
            {errorCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm text-gray-700">Erreurs: <strong>{errorCount}</strong></span>
              </div>
            )}
          </>
        )}
        
        {includeImages && importedImages > 0 && (
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-700">Images: <strong>{importedImages}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportStatistics;
