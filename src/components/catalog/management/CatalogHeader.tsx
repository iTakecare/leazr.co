
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Import, Download } from "lucide-react";

interface CatalogHeaderProps {
  onImportClick?: () => void;
  onExportClick?: () => void;
}

const CatalogHeader: React.FC<CatalogHeaderProps> = ({
  onImportClick,
  onExportClick
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">Gestion Catalogue</h1>
      <div className="flex gap-2">
        {onImportClick && (
          <Button variant="outline" onClick={onImportClick}>
            <Import className="w-4 h-4 mr-2" />
            Importer
          </Button>
        )}
        {onExportClick && (
          <Button variant="outline" onClick={onExportClick}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        )}
        <Button asChild>
          <Link to="/catalog/create">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Produit
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default CatalogHeader;
