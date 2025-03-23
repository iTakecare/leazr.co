
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateOfferPdf } from "@/utils/pdfGenerator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface PreviewControlsProps {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  isDraggable: boolean;
  setIsDraggable: (draggable: boolean) => void;
  hasUnsavedChanges: boolean;
  onSave: () => Promise<void>;
  sampleData: any;
  localTemplate: any;
  setLoading: (loading: boolean) => void;
  isSaving?: boolean;
  useRealData: boolean;
  setUseRealData: (useReal: boolean) => void;
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
  setLoading,
  isSaving = false,
  useRealData,
  setUseRealData
}) => {
  const handleGeneratePreview = async () => {
    try {
      setLoading(true);
      toast.info("Génération du PDF en cours...");
      
      // Ensure sampleData has a valid ID
      const dataWithValidId = {
        ...sampleData,
        id: sampleData.id || `preview-${Date.now()}`, // Add a fallback ID if none exists
        // Make sure all required properties have values
        client_name: sampleData.client_name || "Client Exemple",
        __template: localTemplate
      };
      
      const pdfFilename = await generateOfferPdf(dataWithValidId);
      
      toast.success(`PDF généré avec succès : ${pdfFilename}`);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for zoom control
  const decreaseZoom = () => {
    const newZoom = Math.max(zoomLevel - 0.1, 0.5);
    setZoomLevel(newZoom);
  };

  const increaseZoom = () => {
    const newZoom = Math.min(zoomLevel + 0.1, 2);
    setZoomLevel(newZoom);
  };

  const handleSaveClick = async () => {
    if (hasUnsavedChanges && !isSaving) {
      try {
        await onSave();
        // Le toast de succès est géré dans la fonction onSave
      } catch (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        // Le toast d'erreur est géré dans la fonction onSave
      }
    }
  };

  // Lorsque l'utilisateur termine le positionnement, on lui propose de sauvegarder
  const handleDraggableChange = (newDraggable: boolean) => {
    setIsDraggable(newDraggable);
    
    // Si on désactive le mode de positionnement et qu'il y a des changements non sauvegardés
    if (!newDraggable && hasUnsavedChanges) {
      toast.info("N'oubliez pas de sauvegarder vos modifications", {
        action: {
          label: "Sauvegarder",
          onClick: handleSaveClick
        }
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-2 mb-4">
      <h3 className="text-sm font-medium">Aperçu du modèle de PDF</h3>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 mr-4">
          <Switch
            id="use-real-data"
            checked={useRealData}
            onCheckedChange={setUseRealData}
          />
          <Label htmlFor="use-real-data" className="text-sm">
            Utiliser des données réelles
          </Label>
        </div>
        
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={decreaseZoom}
            disabled={zoomLevel <= 0.5}
            className="h-8 px-2"
          >
            -
          </Button>
          <span className="text-xs px-2">{Math.round(zoomLevel * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={increaseZoom}
            disabled={zoomLevel >= 2}
            className="h-8 px-2"
          >
            +
          </Button>
        </div>
        <Button
          variant={isDraggable ? "default" : "outline"}
          size="sm"
          onClick={() => handleDraggableChange(!isDraggable)}
          className="h-8"
        >
          {isDraggable ? "Terminer le positionnement" : "Positionner les champs"}
        </Button>
        {hasUnsavedChanges && (
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="h-8"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder les positions
              </>
            )}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleGeneratePreview}
          className="h-8"
          disabled={isSaving || (localTemplate?.fields?.length === 0)}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Générer un PDF d'exemple
        </Button>
      </div>
    </div>
  );
};

export default PreviewControls;
