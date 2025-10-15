import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DynamicOverlay } from '@/hooks/useTemplateDesigner';

interface DynamicOverlayEditorProps {
  overlays: DynamicOverlay[];
  onChange: (overlays: DynamicOverlay[]) => void;
}

export const DynamicOverlayEditor: React.FC<DynamicOverlayEditorProps> = ({ overlays, onChange }) => {
  const addOverlay = () => {
    const newOverlay: DynamicOverlay = {
      id: `overlay-${Date.now()}`,
      type: 'text',
      position: { x: 10, y: 10, width: 80, height: 10 },
      content: 'Nouveau texte',
      style: {
        fontSize: 12,
        color: '#000000',
        fontWeight: 'normal',
        align: 'left'
      }
    };
    onChange([...overlays, newOverlay]);
  };

  const updateOverlay = (id: string, updates: Partial<DynamicOverlay>) => {
    onChange(overlays.map(overlay => 
      overlay.id === id ? { ...overlay, ...updates } : overlay
    ));
  };

  const removeOverlay = (id: string) => {
    onChange(overlays.filter(overlay => overlay.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Contenu dynamique (optionnel)</Label>
          <p className="text-sm text-muted-foreground">
            Ajoutez du texte ou des variables au-dessus de l'image/PDF
          </p>
        </div>
        <Button onClick={addOverlay} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {overlays.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Aucun overlay ajouté</p>
        </div>
      ) : (
        <div className="space-y-4">
          {overlays.map((overlay) => (
            <div key={overlay.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Overlay #{overlay.id.slice(-4)}</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeOverlay(overlay.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <select
                    value={overlay.type}
                    onChange={(e) => updateOverlay(overlay.id, { type: e.target.value as any })}
                    className="w-full border rounded-md p-2 text-sm"
                  >
                    <option value="text">Texte fixe</option>
                    <option value="variable">Variable</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs">Contenu</Label>
                  {overlay.type === 'variable' ? (
                    <select
                      value={overlay.content}
                      onChange={(e) => updateOverlay(overlay.id, { content: e.target.value })}
                      className="w-full border rounded-md p-2 text-sm"
                    >
                      <option value="{client_name}">Nom du client</option>
                      <option value="{company_name}">Nom de l'entreprise</option>
                      <option value="{offer_date}">Date de l'offre</option>
                      <option value="{total_amount}">Montant total</option>
                      <option value="{monthly_payment}">Mensualité</option>
                    </select>
                  ) : (
                    <Input
                      value={overlay.content}
                      onChange={(e) => updateOverlay(overlay.id, { content: e.target.value })}
                      placeholder="Texte"
                      className="text-sm"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">X (%)</Label>
                  <Input
                    type="number"
                    value={overlay.position.x}
                    onChange={(e) => updateOverlay(overlay.id, { 
                      position: { ...overlay.position, x: parseInt(e.target.value) }
                    })}
                    min="0"
                    max="100"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Y (%)</Label>
                  <Input
                    type="number"
                    value={overlay.position.y}
                    onChange={(e) => updateOverlay(overlay.id, { 
                      position: { ...overlay.position, y: parseInt(e.target.value) }
                    })}
                    min="0"
                    max="100"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Largeur (%)</Label>
                  <Input
                    type="number"
                    value={overlay.position.width}
                    onChange={(e) => updateOverlay(overlay.id, { 
                      position: { ...overlay.position, width: parseInt(e.target.value) }
                    })}
                    min="1"
                    max="100"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Hauteur (%)</Label>
                  <Input
                    type="number"
                    value={overlay.position.height}
                    onChange={(e) => updateOverlay(overlay.id, { 
                      position: { ...overlay.position, height: parseInt(e.target.value) }
                    })}
                    min="1"
                    max="100"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Taille</Label>
                  <Input
                    type="number"
                    value={overlay.style.fontSize}
                    onChange={(e) => updateOverlay(overlay.id, { 
                      style: { ...overlay.style, fontSize: parseInt(e.target.value) }
                    })}
                    min="8"
                    max="72"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Couleur</Label>
                  <Input
                    type="color"
                    value={overlay.style.color}
                    onChange={(e) => updateOverlay(overlay.id, { 
                      style: { ...overlay.style, color: e.target.value }
                    })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Graisse</Label>
                  <select
                    value={overlay.style.fontWeight}
                    onChange={(e) => updateOverlay(overlay.id, { 
                      style: { ...overlay.style, fontWeight: e.target.value as any }
                    })}
                    className="w-full border rounded-md p-2 text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Gras</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Alignement</Label>
                  <select
                    value={overlay.style.align}
                    onChange={(e) => updateOverlay(overlay.id, { 
                      style: { ...overlay.style, align: e.target.value as any }
                    })}
                    className="w-full border rounded-md p-2 text-sm"
                  >
                    <option value="left">Gauche</option>
                    <option value="center">Centre</option>
                    <option value="right">Droite</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
