import React, { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { PDFModel } from "@/utils/pdfModelUtils";
import PreviewControls from "./pdf-preview/PreviewControls";
import PDFPage from "./pdf-preview/PDFPage";
import PageNavigation from "./pdf-preview/PageNavigation";
import { usePDFPreview } from "./pdf-preview/usePDFPreview";
import { PDFPreviewDragProvider, useDragState, useDragActions } from "./pdf-preview/PDFPreviewDragContext";

interface SimplePDFPreviewProps {
  template: PDFModel;
  onSave: (template: PDFModel) => Promise<void>;
}

const PreviewContainer: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDragging, draggedFieldId } = useDragState();
  const { updateFieldPosition, endDrag } = useDragActions();
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedFieldId || !containerRef.current) return;
    updateFieldPosition(e.clientX, e.clientY, containerRef.current.getBoundingClientRect(), 1);
  };
  
  return (
    <div 
      ref={containerRef}
      className="bg-white shadow-lg relative mx-auto" 
      style={{ 
        width: '210mm', 
        height: '297mm',
        maxWidth: "100%"
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={endDrag}
      onMouseUp={endDrag}
    >
      {children}
    </div>
  );
};

const PDFPreviewContent: React.FC<SimplePDFPreviewProps> = ({ template, onSave }) => {
  const {
    localTemplate,
    zoomLevel,
    setZoomLevel,
    currentPage,
    setCurrentPage,
    pageLoaded,
    setPageLoaded,
    loading,
    isSaving,
    useRealData,
    setUseRealData,
    realData,
    handleGeneratePreview,
    handleSave,
    getCurrentPageBackground,
    getCurrentPageFields,
    handleImageError,
    handleImageLoad,
    getCurrentData
  } = usePDFPreview(template, onSave);
  
  const { hasUnsavedChanges } = useDragState();
  
  const fields = getCurrentPageFields();
  const backgroundImage = getCurrentPageBackground();
  const totalPages = localTemplate?.templateImages?.length || 1;
  
  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Aperçu du modèle</CardTitle>
        {hasUnsavedChanges && (
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <PreviewControls 
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          onSave={handleSave}
          onGeneratePreview={handleGeneratePreview}
          sampleData={getCurrentData()}
          loading={loading}
          isSaving={isSaving}
          useRealData={useRealData}
          setUseRealData={setUseRealData}
          realData={realData}
        />
        
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement...</span>
          </div>
        ) : (
          <div className="bg-gray-100 p-4 flex justify-center min-h-[800px] overflow-auto">
            <PreviewContainer>
              <PageNavigation 
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
              />
              
              <PDFPage 
                currentPage={currentPage}
                template={localTemplate}
                backgroundImage={backgroundImage}
                pageLoaded={pageLoaded}
                fields={fields}
                zoomLevel={zoomLevel}
                sampleData={getCurrentData()}
                onImageLoad={handleImageLoad}
                onImageError={handleImageError}
              />
            </PreviewContainer>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground mt-4">
          <p>Pour positionner les champs sur vos pages:</p>
          <ol className="list-decimal list-inside ml-4 space-y-1 mt-2">
            <li>Cliquez sur "Positionner les champs" pour activer le mode de positionnement</li>
            <li>Déplacez les champs en les faisant glisser à l'emplacement souhaité</li>
            <li>Cliquez sur "Sauvegarder" pour enregistrer les positions</li>
            <li>Cliquez sur "Terminer le positionnement" pour désactiver le mode d'édition</li>
          </ol>
          <p className="mt-2 font-medium text-blue-600">Note: Les coordonnées X/Y représentent la position en millimètres depuis le coin supérieur gauche de la page.</p>
          {totalPages > 1 && <p className="mt-2">Utilisez les boutons de navigation pour parcourir les différentes pages du document.</p>}
        </div>
      </CardContent>
    </>
  );
};

const SimplePDFPreview: React.FC<SimplePDFPreviewProps> = (props) => {
  return (
    <Card className="w-full">
      <PDFPreviewDragProvider 
        template={props.template} 
        onTemplateChange={(template) => {
          // This doesn't immediately save to the server, it just updates the local state
          // The save button will trigger the actual save operation
        }}
      >
        <PDFPreviewContent {...props} />
      </PDFPreviewDragProvider>
    </Card>
  );
};

export default SimplePDFPreview;
