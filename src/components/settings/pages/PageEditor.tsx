import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, FileText, Layout } from 'lucide-react';
import { CustomPage, ContentBlock } from '@/hooks/useTemplateDesigner';
import { BlockEditor } from './BlockEditor';
import { ImageUploader } from './ImageUploader';
import { PdfUploader } from './PdfUploader';
import { DynamicOverlayEditor } from './DynamicOverlayEditor';
import { v4 as uuidv4 } from 'uuid';

interface PageEditorProps {
  page: CustomPage;
  onSave: (page: CustomPage) => void;
  onCancel: () => void;
}

export const PageEditor: React.FC<PageEditorProps> = ({ page: initialPage, onSave, onCancel }) => {
  const [page, setPage] = useState<CustomPage>({
    ...initialPage,
    sourceType: initialPage.sourceType || 'blocks',
    blocks: initialPage.blocks || [],
    dynamicOverlays: initialPage.dynamicOverlays || []
  });
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);

  const handleAddBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: uuidv4(),
      type,
      order: page.blocks.length,
      width: '100%',
      content: getDefaultContent(type),
      style: {
        fontSize: 12,
        color: '#1e293b',
        fontWeight: 'normal',
        align: 'left',
        padding: 10,
        margin: 5
      }
    };

    setPage({
      ...page,
      blocks: [...page.blocks, newBlock]
    });
  };

  const getDefaultContent = (type: ContentBlock['type']): any => {
    switch (type) {
      case 'text':
        return { text: "Votre texte ici", isTitle: false, isRichText: false };
      case 'image':
        return { url: "", alt: "Image", width: 200, height: 150, position: 'center' };
      case 'logo':
        return { useCompanyLogo: true, size: 120, position: 'center' };
      case 'stats':
        return { stats: [], layout: 'grid' };
      case 'testimonial':
        return { quote: "", author: "", company: "", avatarUrl: "" };
      case 'list':
        return { items: [], style: 'bullet', icon: '' };
      case 'table':
        return { headers: [], rows: [] };
      case 'spacer':
        return { height: 20 };
      default:
        return {};
    }
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = page.blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= page.blocks.length) return;

    const updated = [...page.blocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((b, idx) => b.order = idx);
    
    setPage({ ...page, blocks: updated });
  };

  const handleDeleteBlock = (blockId: string) => {
    const updated = page.blocks.filter(b => b.id !== blockId);
    updated.forEach((b, idx) => b.order = idx);
    setPage({ ...page, blocks: updated });
  };

  const handleSaveBlock = (block: ContentBlock) => {
    const index = page.blocks.findIndex(b => b.id === block.id);
    if (index === -1) return;

    const updated = [...page.blocks];
    updated[index] = block;
    setPage({ ...page, blocks: updated });
    setEditingBlock(null);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la page</DialogTitle>
            <DialogDescription>
              Personnalisez le contenu et la mise en page de votre page personnalisée
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la page</Label>
              <Input
                id="title"
                value={page.title}
                onChange={(e) => setPage({ ...page, title: e.target.value })}
                placeholder="Ex: Page de garde"
              />
            </div>

            {/* Mode selector */}
            <div className="space-y-3">
              <Label>Mode de création</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPage({ ...page, sourceType: 'blocks' })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    page.sourceType === 'blocks'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Layout className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">Blocs</p>
                  <p className="text-xs text-muted-foreground">Flexible, léger</p>
                </button>
                
                <button
                  onClick={() => setPage({ ...page, sourceType: 'image' })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    page.sourceType === 'image'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <ImageIcon className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">Image</p>
                  <p className="text-xs text-muted-foreground">Design complet</p>
                </button>
                
                <button
                  onClick={() => setPage({ ...page, sourceType: 'pdf' })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    page.sourceType === 'pdf'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <FileText className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">PDF</p>
                  <p className="text-xs text-muted-foreground">Import existant</p>
                </button>
              </div>
            </div>

            {/* Conditional content based on sourceType */}
            {page.sourceType === 'blocks' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="layout">Disposition</Label>
                  <select
                    id="layout"
                    value={page.layout}
                    onChange={(e) => setPage({ ...page, layout: e.target.value as any })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="full-width">Pleine largeur</option>
                    <option value="two-columns">Deux colonnes</option>
                    <option value="three-columns">Trois colonnes</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Couleur de fond</Label>
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={page.backgroundColor || '#ffffff'}
                    onChange={(e) => setPage({ ...page, backgroundColor: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Blocs de contenu</Label>
                    <div className="flex gap-2">
                      <Button onClick={() => handleAddBlock('text')} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Texte
                      </Button>
                      <Button onClick={() => handleAddBlock('image')} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Image
                      </Button>
                      <Button onClick={() => handleAddBlock('logo')} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Logo
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 border rounded-lg p-4 max-h-96 overflow-y-auto">
                    {page.blocks.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucun bloc ajouté. Cliquez sur les boutons ci-dessus pour ajouter du contenu.
                      </p>
                    ) : (
                      page.blocks
                        .sort((a, b) => a.order - b.order)
                        .map((block, index) => (
                          <div
                            key={block.id}
                            className="flex items-center justify-between p-3 bg-accent/50 rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">#{index + 1}</span>
                              <span className="text-sm">{block.type}</span>
                              <span className="text-xs text-muted-foreground">({block.width})</span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                onClick={() => handleMoveBlock(block.id, 'up')}
                                size="sm"
                                variant="ghost"
                                disabled={index === 0}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleMoveBlock(block.id, 'down')}
                                size="sm"
                                variant="ghost"
                                disabled={index === page.blocks.length - 1}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => setEditingBlock(block)}
                                size="sm"
                                variant="outline"
                              >
                                Éditer
                              </Button>
                              <Button
                                onClick={() => handleDeleteBlock(block.id)}
                                size="sm"
                                variant="ghost"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </>
            )}

            {page.sourceType === 'image' && (
              <>
                <ImageUploader
                  value={page.backgroundImage}
                  onChange={(value) => setPage({ ...page, backgroundImage: value })}
                />
                
                <DynamicOverlayEditor
                  overlays={page.dynamicOverlays || []}
                  onChange={(overlays) => setPage({ ...page, dynamicOverlays: overlays })}
                />
              </>
            )}

            {page.sourceType === 'pdf' && (
              <>
                <PdfUploader
                  value={page.pdfSource}
                  onChange={(value) => setPage({ ...page, pdfSource: value })}
                />
                
                <DynamicOverlayEditor
                  overlays={page.dynamicOverlays || []}
                  onChange={(overlays) => setPage({ ...page, dynamicOverlays: overlays })}
                />
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button onClick={() => onSave(page)}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingBlock && (
        <BlockEditor
          block={editingBlock}
          onSave={handleSaveBlock}
          onCancel={() => setEditingBlock(null)}
        />
      )}
    </>
  );
};
