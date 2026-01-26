import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2, GripVertical, Save, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { cn } from '@/lib/utils';

export interface DashboardCard {
  id: string;
  label: string;
  visible: boolean;
}

interface DashboardEditModeProps {
  cards: DashboardCard[];
  onSave: (cards: DashboardCard[]) => void;
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  isSaving?: boolean;
}

export const DashboardEditMode = ({ 
  cards, 
  onSave, 
  isEditMode, 
  setIsEditMode,
  isSaving = false
}: DashboardEditModeProps) => {
  const [editableCards, setEditableCards] = useState<DashboardCard[]>(cards);

  useEffect(() => {
    setEditableCards(cards);
  }, [cards]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(editableCards);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setEditableCards(items);
  };

  const toggleCardVisibility = (cardId: string) => {
    setEditableCards(prev => 
      prev.map(card => 
        card.id === cardId ? { ...card, visible: !card.visible } : card
      )
    );
  };

  const handleSave = () => {
    onSave(editableCards);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setEditableCards(cards);
    setIsEditMode(false);
  };

  if (!isEditMode) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setIsEditMode(true)}
        className="gap-2"
      >
        <Settings2 className="h-4 w-4" />
        Personnaliser
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Mode édition activé
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-1" />
            Annuler
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <Card className="p-4 border-dashed border-2 border-primary/30 bg-primary/5">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dashboard-cards">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {editableCards.map((card, index) => (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg bg-card border transition-shadow",
                          snapshot.isDragging && "shadow-lg ring-2 ring-primary/20"
                        )}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Checkbox
                          id={card.id}
                          checked={card.visible}
                          onCheckedChange={() => toggleCardVisibility(card.id)}
                        />
                        <label 
                          htmlFor={card.id}
                          className={cn(
                            "flex-1 text-sm cursor-pointer",
                            !card.visible && "text-muted-foreground line-through"
                          )}
                        >
                          {card.label}
                        </label>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </Card>
    </div>
  );
};

export default DashboardEditMode;
