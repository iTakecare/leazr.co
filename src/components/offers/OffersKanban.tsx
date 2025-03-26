
import React, { useRef } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { KANBAN_COLUMNS } from "./kanban/kanbanConfig";
import KanbanColumn from "./kanban/KanbanColumn";

interface OffersKanbanProps {
  offers: Offer[];
  onStatusChange: (offerId: string, newStatus: string) => Promise<void>;
  isUpdatingStatus: boolean;
  onDeleteOffer: (id: string) => Promise<void>;
  includeConverted: boolean;
}

const OffersKanban: React.FC<OffersKanbanProps> = ({
  offers,
  onStatusChange,
  isUpdatingStatus,
  onDeleteOffer,
  includeConverted,
}) => {
  // Répartir les offres par colonne
  const getOffersForColumn = (columnId: string) => {
    return offers.filter(offer => {
      // Critère de statut
      const statusMatch = offer.workflow_status === columnId;
      
      // Si l'offre est convertie en contrat et que nous n'incluons pas les offres converties
      if (offer.converted_to_contract && !includeConverted) {
        return false;
      }
      
      return statusMatch;
    });
  };

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    // Si pas de destination (drag annulé) ou destination identique à source, on ne fait rien
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    // Si la colonne de destination est différente, on change le statut
    if (destination.droppableId !== source.droppableId) {
      await onStatusChange(draggableId, destination.droppableId);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex overflow-x-auto pb-4 gap-4 py-1 px-1 scroll-smooth snap-x">
          {KANBAN_COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              icon={column.icon}
              color={column.color}
              borderColor={column.borderColor}
              textColor={column.textColor}
              offers={getOffersForColumn(column.id)}
              onDeleteOffer={onDeleteOffer}
              onStatusChange={onStatusChange}
              isUpdatingStatus={isUpdatingStatus}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default OffersKanban;
