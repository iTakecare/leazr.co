
import React from "react";
import { Button } from "@/components/ui/button";
import { Save, FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateOfferPdf } from "@/utils/pdfGenerator";

interface PreviewControlsProps {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  isDraggable: boolean;
  setIsDraggable: (draggable: boolean) => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  sampleData: any;
  localTemplate: any;
  setLoading: (loading: boolean) => void;
}

const PreviewControls: React.FC<PreviewControlsProps> = ({
  zoomLevel,
  setZoomLevel,
  isDraggable,
  setIsDraggable,
  hasUnsavedChanges,
  onSave,
  sampleData,
  localTemplate,
  setLoading
}) => {
  const handleGeneratePreview = async () => {
    try {
      setLoading(true);
      
      const offerWithTemplate = {
        ...sampleData,
        __template: localTemplate
      };
      
      const pdfFilename = await generateOfferPdf(offerWithTemplate);
      
      toast.success(`PDF généré avec succès : ${pdfFilename}`);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-medium">Aperçu du modèle de PDF</h3>
      <div className="flex gap-2">
        <div className="flex items-center border rounded-md mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.5))}
            disabled={zoomLevel <= 0.5}
            className="h-8 px-2"
          >
            -
          </Button>
          <span className="text-xs px-2">{Math.round(zoomLevel * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 2))}
            disabled={zoomLevel >= 2}
            className="h-8 px-2"
          >
            +
          </Button>
        </div>
        <Button
          variant={isDraggable ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setIsDraggable(!isDraggable);
            if (isDraggable && hasUnsavedChanges) {
              toast.info("N'oubliez pas de sauvegarder vos modifications");
            }
          }}
          className="h-8"
        >
          {isDraggable ? "Terminer le positionnement" : "Positionner les champs"}
        </Button>
        {hasUnsavedChanges && (
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            className="h-8"
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder les positions
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleGeneratePreview}
          className="h-8"
        >
          <FileDown className="h-4 w-4 mr-2" />
          Générer un PDF d'exemple
        </Button>
      </div>
    </div>
  );
};

export default PreviewControls;
