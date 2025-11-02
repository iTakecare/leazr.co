import { PageHeader } from "@/components/page-header";
import { CatalogImportForm } from "@/components/admin/catalog/CatalogImportForm";
import { ImageMigrationPanel } from "@/components/catalog/ImageMigrationPanel";

export default function CatalogImportPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Import du catalogue"
        description="Importez automatiquement les produits depuis le catalogue iTakecare.be"
      />
      
      <ImageMigrationPanel />
      
      <CatalogImportForm />
    </div>
  );
}