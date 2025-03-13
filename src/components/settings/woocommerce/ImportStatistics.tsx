
import React from 'react';
import { CheckCircle2, ImageIcon, AlertCircle } from 'lucide-react';

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
  if (productsCount === 0 && !completed) return null;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
      <div className="bg-green-50 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center">
          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
          <div>
            <div className="text-sm font-medium text-green-800">Produits importés</div>
            <div className="text-2xl font-bold text-green-700">{successCount}</div>
          </div>
        </div>
        {completed && successCount > 0 && (
          <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
            {Math.round((successCount / productsCount) * 100)}%
          </div>
        )}
      </div>
      
      {includeImages && (
        <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <ImageIcon className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <div className="text-sm font-medium text-blue-800">Images importées</div>
              <div className="text-2xl font-bold text-blue-700">{importedImages}</div>
            </div>
          </div>
        </div>
      )}
      
      <div className={`${errorCount > 0 ? 'bg-red-50' : 'bg-gray-50'} rounded-lg p-4 flex items-center justify-between`}>
        <div className="flex items-center">
          <AlertCircle className={`h-5 w-5 ${errorCount > 0 ? 'text-red-500' : 'text-gray-400'} mr-2`} />
          <div>
            <div className={`text-sm font-medium ${errorCount > 0 ? 'text-red-800' : 'text-gray-600'}`}>
              Erreurs
            </div>
            <div className={`text-2xl font-bold ${errorCount > 0 ? 'text-red-700' : 'text-gray-500'}`}>
              {errorCount}
            </div>
          </div>
        </div>
        {completed && errorCount > 0 && (
          <div className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
            {Math.round((errorCount / productsCount) * 100)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportStatistics;
