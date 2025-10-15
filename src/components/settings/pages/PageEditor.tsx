import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomPage, ContentBlock } from '@/hooks/useTemplateDesigner';
import { BlockEditor } from './BlockEditor';
import { ChevronUp, ChevronDown, Edit, Trash2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { v4 as uuidv4 } from 'uuid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageEditorProps {
  page: CustomPage;
  onSave: (page: CustomPage) => void;
  onCancel: () => void;
}

export const PageEditor: React.FC<PageEditorProps> = ({ page: initialPage, onSave, onCancel }) => {
  const [page, setPage] = useState<CustomPage>(initialPage);
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
            <DialogTitle>Éditer : {page.title}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6">
            {/* Configuration */}
            <div className="space-y-4">
              <div>
                <Label>Titre de la page</Label>
                <Input
                  value={page.title}
                  onChange={(e) => setPage({ ...page, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Disposition</Label>
                <Select
                  value={page.layout}
                  onValueChange={(value: CustomPage['layout']) => setPage({ ...page, layout: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-width">Pleine largeur</SelectItem>
                    <SelectItem value="two-columns">2 colonnes</SelectItem>
                    <SelectItem value="three-columns">3 colonnes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Couleur de fond</Label>
                <Input
                  type="color"
                  value={page.backgroundColor || '#ffffff'}
                  onChange={(e) => setPage({ ...page, backgroundColor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Blocs de contenu</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAddBlock('text')}>Texte</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddBlock('image')}>Image</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddBlock('logo')}>Logo</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddBlock('stats')}>Statistiques</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddBlock('testimonial')}>Témoignage</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddBlock('list')}>Liste</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddBlock('table')}>Tableau</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddBlock('spacer')}>Espacement</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {page.blocks.map((block, index) => (
                    <Card key={block.id} className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-sm font-medium capitalize">{block.type}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveBlock(block.id, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveBlock(block.id, 'down')}
                          disabled={index === page.blocks.length - 1}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingBlock(block)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBlock(block.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Prévisualisation */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="text-sm font-medium mb-2">Prévisualisation</h4>
              <div 
                className="bg-white rounded border p-4 min-h-[400px]"
                style={{ backgroundColor: page.backgroundColor }}
              >
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {page.blocks.length} bloc(s)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Layout: {page.layout}
                  </p>
                </div>
              </div>
            </div>
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
