import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Undo,
  Redo,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Eye,
  Settings,
  Layers,
  MousePointer,
  Move,
  Copy,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedToolbarProps {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPreview: () => void;
  onCopySelected: () => void;
  onDeleteSelected: () => void;
  zoomLevel: number;
  hasUnsavedChanges: boolean;
  selectedFieldsCount: number;
  canUndo: boolean;
  canRedo: boolean;
  gridVisible: boolean;
  activeTool: 'select' | 'move';
  onToolChange: (tool: 'select' | 'move') => void;
  className?: string;
}

export const AdvancedToolbar: React.FC<AdvancedToolbarProps> = ({
  onSave,
  onUndo,
  onRedo,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  onPreview,
  onCopySelected,
  onDeleteSelected,
  zoomLevel,
  hasUnsavedChanges,
  selectedFieldsCount,
  canUndo,
  canRedo,
  gridVisible,
  activeTool,
  onToolChange,
  className
}) => {
  return (
    <div className={cn(
      "flex items-center gap-1 p-2 bg-background border-b border-border",
      className
    )}>
      {/* Groupe Fichier */}
      <div className="flex items-center gap-1">
        <Button
          variant={hasUnsavedChanges ? "default" : "outline"}
          size="sm"
          onClick={onSave}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Sauvegarder
          {hasUnsavedChanges && (
            <Badge variant="destructive" className="h-4 w-4 p-0 text-[10px]">
              •
            </Badge>
          )}
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Groupe Historique */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Annuler (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Refaire (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Groupe Outils */}
      <div className="flex items-center gap-1">
        <Button
          variant={activeTool === 'select' ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onToolChange('select')}
          title="Outil de sélection"
        >
          <MousePointer className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === 'move' ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onToolChange('move')}
          title="Outil de déplacement"
        >
          <Move className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Groupe Affichage */}
      <div className="flex items-center gap-1">
        <Button
          variant={gridVisible ? "secondary" : "ghost"}
          size="sm"
          onClick={onToggleGrid}
          title="Afficher/Masquer la grille"
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          title="Zoom arrière"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground min-w-[50px] text-center">
          {Math.round(zoomLevel * 100)}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          title="Zoom avant"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Groupe Actions sur sélection */}
      {selectedFieldsCount > 0 && (
        <>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              {selectedFieldsCount} sélectionné{selectedFieldsCount > 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopySelected}
              title="Copier la sélection"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteSelected}
              title="Supprimer la sélection"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* Groupe Prévisualisation */}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          Aperçu
        </Button>
      </div>
    </div>
  );
};