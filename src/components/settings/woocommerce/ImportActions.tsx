
import React from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud, Package, X } from 'lucide-react';
import { ImportStatus } from './types';

interface ImportActionsProps {
  onFetchProducts: () => void;
  onImportProducts: () => void;
  onReset: () => void;
  productsCount: number;
  importStatus: ImportStatus;
}

const ImportActions: React.FC<ImportActionsProps> = ({
  onFetchProducts,
  onImportProducts,
  onReset,
  productsCount,
  importStatus
}) => {
  const isDisabled = importStatus === 'fetching' || importStatus === 'importing';
  
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={onFetchProducts}
        disabled={isDisabled}
        className="flex items-center gap-2"
      >
        <DownloadCloud className="h-4 w-4" />
        Récupérer les produits
      </Button>

      <Button
        onClick={onImportProducts}
        disabled={productsCount === 0 || isDisabled}
        className="flex items-center gap-2"
      >
        <Package className="h-4 w-4" />
        Importer {productsCount} produits
      </Button>

      <Button
        variant="outline"
        onClick={onReset}
        disabled={isDisabled}
        className="flex items-center gap-2"
      >
        <X className="h-4 w-4" />
        Réinitialiser
      </Button>
    </div>
  );
};

export default ImportActions;
