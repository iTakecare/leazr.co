import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentBlock } from '@/hooks/useTemplateDesigner';

interface BlockEditorProps {
  block: ContentBlock;
  onSave: (block: ContentBlock) => void;
  onCancel: () => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ block: initialBlock, onSave, onCancel }) => {
  const [block, setBlock] = useState<ContentBlock>(initialBlock);

  const updateContent = (updates: any) => {
    setBlock({
      ...block,
      content: { ...block.content, ...updates }
    });
  };

  const updateStyle = (updates: any) => {
    setBlock({
      ...block,
      style: { ...block.style, ...updates }
    });
  };

  const renderContentEditor = () => {
    switch (block.type) {
      case 'text':
        return (
          <>
            <div>
              <Label>Texte</Label>
              <Textarea
                value={block.content.text || ''}
                onChange={(e) => updateContent({ text: e.target.value })}
                rows={5}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isTitle"
                checked={block.content.isTitle || false}
                onChange={(e) => updateContent({ isTitle: e.target.checked })}
              />
              <Label htmlFor="isTitle">Titre principal</Label>
            </div>
          </>
        );

      case 'image':
        return (
          <>
            <div>
              <Label>URL de l'image</Label>
              <Input
                value={block.content.url || ''}
                onChange={(e) => updateContent({ url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Largeur (px)</Label>
                <Input
                  type="number"
                  value={block.content.width || 200}
                  onChange={(e) => updateContent({ width: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Hauteur (px)</Label>
                <Input
                  type="number"
                  value={block.content.height || 150}
                  onChange={(e) => updateContent({ height: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </>
        );

      case 'logo':
        return (
          <>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useCompanyLogo"
                checked={block.content.useCompanyLogo || false}
                onChange={(e) => updateContent({ useCompanyLogo: e.target.checked })}
              />
              <Label htmlFor="useCompanyLogo">Utiliser le logo de l'entreprise</Label>
            </div>
            <div>
              <Label>Taille (px)</Label>
              <Input
                type="number"
                value={block.content.size || 120}
                onChange={(e) => updateContent({ size: parseInt(e.target.value) })}
              />
            </div>
          </>
        );

      case 'list':
        return (
          <>
            <div>
              <Label>Items (un par ligne)</Label>
              <Textarea
                value={(block.content.items || []).join('\n')}
                onChange={(e) => updateContent({ items: e.target.value.split('\n').filter(Boolean) })}
                rows={5}
              />
            </div>
            <div>
              <Label>Style</Label>
              <Select
                value={block.content.style || 'bullet'}
                onValueChange={(value) => updateContent({ style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bullet">Puces</SelectItem>
                  <SelectItem value="numbered">Numérotée</SelectItem>
                  <SelectItem value="checkmarks">Coches</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'testimonial':
        return (
          <>
            <div>
              <Label>Citation</Label>
              <Textarea
                value={block.content.quote || ''}
                onChange={(e) => updateContent({ quote: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Auteur</Label>
              <Input
                value={block.content.author || ''}
                onChange={(e) => updateContent({ author: e.target.value })}
              />
            </div>
            <div>
              <Label>Entreprise</Label>
              <Input
                value={block.content.company || ''}
                onChange={(e) => updateContent({ company: e.target.value })}
              />
            </div>
          </>
        );

      case 'spacer':
        return (
          <div>
            <Label>Hauteur (px)</Label>
            <Input
              type="number"
              value={block.content.height || 20}
              onChange={(e) => updateContent({ height: parseInt(e.target.value) })}
            />
          </div>
        );

      default:
        return <p className="text-sm text-muted-foreground">Configuration non disponible pour ce type de bloc.</p>;
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Éditer le bloc : {block.type}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Largeur du bloc</Label>
            <Select
              value={block.width}
              onValueChange={(value: ContentBlock['width']) => setBlock({ ...block, width: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100%">Pleine largeur</SelectItem>
                <SelectItem value="50%">Demi-largeur</SelectItem>
                <SelectItem value="33%">Tiers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderContentEditor()}

          {block.type !== 'spacer' && (
            <>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Style</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Taille police (pt)</Label>
                    <Input
                      type="number"
                      value={block.style?.fontSize || 12}
                      onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Couleur</Label>
                    <Input
                      type="color"
                      value={block.style?.color || '#1e293b'}
                      onChange={(e) => updateStyle({ color: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Poids</Label>
                    <Select
                      value={block.style?.fontWeight || 'normal'}
                      onValueChange={(value) => updateStyle({ fontWeight: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Gras</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Alignement</Label>
                    <Select
                      value={block.style?.align || 'left'}
                      onValueChange={(value) => updateStyle({ align: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Gauche</SelectItem>
                        <SelectItem value="center">Centre</SelectItem>
                        <SelectItem value="right">Droite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={() => onSave(block)}>
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
