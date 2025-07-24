import { PageHeader } from "@/components/page-header";
import { CatalogImportForm } from "@/components/admin/catalog/CatalogImportForm";

export default function CatalogImportPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Import du catalogue"
        description="Importez automatiquement les produits depuis le catalogue iTakecare.be"
      />
      
      <CatalogImportForm />
    </div>
  );
}