import { PdfTemplateTest } from "@/components/admin/PdfTemplateTest";

const PdfTestPage = () => {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test de génération PDF</h1>
        <p className="text-muted-foreground">
          Interface de test pour valider la génération de PDF d'offres avec le template iTakecare v1
        </p>
      </div>
      
      <PdfTemplateTest />
    </div>
  );
};

export default PdfTestPage;
