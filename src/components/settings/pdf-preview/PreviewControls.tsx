
import React from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2, FileDown } from "lucide-react";
import { useDragState, useDragActions } from "./PDFPreviewDragContext";

interface PreviewControlsProps {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  onSave: () => Promise<void>;
  onGeneratePreview: () => Promise<void>;
  sampleData: any;
  loading: boolean;
  isSaving: boolean;
  useRealData: boolean;
  setUseRealData: (use: boolean) => void;
  realData: any;
}

const PreviewControls: React.FC<PreviewControlsProps> = ({
  zoomLevel,
  setZoomLevel,
  onSave,
  onGeneratePreview,
  sampleData,
  loading,
  isSaving,
  useRealData,
  setUseRealData,
  realData
}) => {
  const { hasUnsavedChanges, isDraggable } = useDragState();
  const { toggleDragMode } = useDragActions();

  const zoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 0.1, 2));
  };

  const zoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 0.1, 0.5));
  };

  return (
    <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
      <div className="flex items-center space-x-2">
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={zoomLevel <= 0.5}
            className="h-8 px-2"
          >
            -
          </Button>
          <span className="text-xs px-2">{Math.round(zoomLevel * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={zoomLevel >= 2}
            className="h-8 px-2"
          >
            +
          </Button>
        </div>

        <Button
          variant={isDraggable ? "default" : "outline"}
          size="sm"
          onClick={toggleDragMode}
        >
          {isDraggable ? "Terminer le positionnement" : "Positionner les champs"}
        </Button>
      </div>

      <div className="flex space-x-2">
        {realData && (
          <div className="flex items-center space-x-2">
            <label className="text-sm">
              <input
                type="checkbox"
                checked={useRealData}
                onChange={(e) => setUseRealData(e.target.checked)}
                className="mr-1"
              />
              Utiliser des données réelles
            </label>
          </div>
        )}

        {hasUnsavedChanges && (
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
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

        <Button
          variant="outline"
          size="sm"
          onClick={onGeneratePreview}
          disabled={loading}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Générer un PDF d'exemple
        </Button>
      </div>
    </div>
  );
};

export default PreviewControls;
