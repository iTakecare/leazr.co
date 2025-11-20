import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, X, Loader2 } from "lucide-react";
import { ProductUpsell } from "@/hooks/products/useProductUpsells";
import { useRemoveProductUpsell, useUpdateUpsellPriorities } from "@/hooks/products/useProductUpsells";
import { useProductById } from "@/hooks/products/useProductById";

interface UpsellSelectedListProps {
  productId: string;
  manualUpsells: ProductUpsell[];
  isLoading: boolean;
}

export const UpsellSelectedList = ({ productId, manualUpsells, isLoading }: UpsellSelectedListProps) => {
  const [items, setItems] = useState(manualUpsells);
  const removeUpsell = useRemoveProductUpsell();
  const updatePriorities = useUpdateUpsellPriorities();

  // Synchroniser les items avec les props
  useState(() => {
    setItems(manualUpsells);
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);

    // Mettre à jour les priorités (index inversé pour que le premier ait la priorité la plus haute)
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      priority: reorderedItems.length - index,
    }));

    setItems(reorderedItems);
    updatePriorities.mutate({ productId, updates });
  };

  const handleRemove = (upsellId: string) => {
    removeUpsell.mutate({ productId, upsellId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucun upsell sélectionné. Ajoutez des produits depuis la liste de droite.
        </CardContent>
      </Card>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="upsells-list">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-2"
          >
            {items.map((upsell, index) => (
              <UpsellItem
                key={upsell.id}
                upsell={upsell}
                index={index}
                onRemove={handleRemove}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

interface UpsellItemProps {
  upsell: ProductUpsell;
  index: number;
  onRemove: (id: string) => void;
}

const UpsellItem = ({ upsell, index, onRemove }: UpsellItemProps) => {
  const { product, isLoading } = useProductById(upsell.upsell_product_id);

  if (isLoading || !product) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Draggable draggableId={upsell.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={snapshot.isDragging ? "shadow-lg" : ""}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-12 w-12 object-cover rounded"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  {upsell.source === 'auto' && (
                    <Badge variant="secondary" className="text-xs">Suggéré</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {product.monthly_price ? `${product.monthly_price.toFixed(2)} €/mois` : 'Prix non défini'}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(upsell.id)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
};
