import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomPage } from '@/hooks/useTemplateDesigner';
import { ChevronUp, ChevronDown, Edit, Copy, Trash2, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PageEditor } from './PageEditor';
import { PAGE_TEMPLATES } from './PageTemplates';
import { v4 as uuidv4 } from 'uuid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageManagerProps {
  pages: CustomPage[];
  position: 'before' | 'after';
  onUpdate: (pages: CustomPage[]) => void;
}

export const PageManager: React.FC<PageManagerProps> = ({ pages, position, onUpdate }) => {
  const [editingPage, setEditingPage] = useState<CustomPage | null>(null);

  const handleToggle = (pageId: string, enabled: boolean) => {
    const updated = pages.map(p => 
      p.id === pageId ? { ...p, enabled } : p
    );
    onUpdate(updated);
  };

  const handleMove = (pageId: string, direction: 'up' | 'down') => {
    const index = pages.findIndex(p => p.id === pageId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pages.length) return;

    const updated = [...pages];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((p, idx) => p.order = idx);
    
    onUpdate(updated);
  };

  const handleDelete = (pageId: string) => {
    const updated = pages.filter(p => p.id !== pageId);
    updated.forEach((p, idx) => p.order = idx);
    onUpdate(updated);
  };

  const handleDuplicate = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    const duplicated: CustomPage = {
      ...page,
      id: uuidv4(),
      title: `${page.title} (copie)`,
      order: pages.length,
      blocks: page.blocks.map(block => ({
        ...block,
        id: uuidv4()
      }))
    };

    onUpdate([...pages, duplicated]);
  };

  const handleAddFromTemplate = (templateKey: string) => {
    const template = PAGE_TEMPLATES[templateKey];
    if (!template) return;

    const newPage: CustomPage = {
      ...template,
      id: uuidv4(),
      order: pages.length,
      blocks: template.blocks.map(block => ({
        ...block,
        id: uuidv4()
      }))
    };

    onUpdate([...pages, newPage]);
  };

  const handleSavePage = (page: CustomPage) => {
    const index = pages.findIndex(p => p.id === page.id);
    if (index === -1) {
      onUpdate([...pages, { ...page, order: pages.length }]);
    } else {
      const updated = [...pages];
      updated[index] = page;
      onUpdate(updated);
    }
    setEditingPage(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Pages {position === 'before' ? 'avant' : 'après'} l'offre
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle page
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => handleAddFromTemplate('coverPage')}>
              📄 Page de garde
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddFromTemplate('visionPage')}>
              🎯 Notre vision
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddFromTemplate('statsPage')}>
              📊 Nos chiffres
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddFromTemplate('testimonialsPage')}>
              💬 Témoignages
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddFromTemplate('termsPage')}>
              📋 Modalités
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddFromTemplate('blankPage')}>
              ⭐ Page blanche
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {pages.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          <p>Aucune page. Ajoutez-en une depuis le menu ci-dessus.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {pages.map((page, index) => (
            <Card key={page.id} className="p-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={page.enabled}
                  onCheckedChange={(checked) => handleToggle(page.id, !!checked)}
                />
                <span className="flex-1 font-medium">{page.title}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMove(page.id, 'up')}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMove(page.id, 'down')}
                    disabled={index === pages.length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingPage(page)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicate(page.id)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(page.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editingPage && (
        <PageEditor
          page={editingPage}
          onSave={handleSavePage}
          onCancel={() => setEditingPage(null)}
        />
      )}
    </div>
  );
};
