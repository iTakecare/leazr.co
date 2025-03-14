
import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";
import OfferCard from "@/components/offers/OfferCard";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { KanbanPlus, KanbanSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface OffersKanbanProps {
  offers: Offer[];
  onStatusChange: (offerId: string, newStatus: string) => Promise<void>;
  isUpdatingStatus: boolean;
  onDeleteOffer: (id: string) => Promise<void>;
  includeConverted: boolean;
}

// Définition des colonnes du Kanban
const KANBAN_COLUMNS = [
  {
    id: OFFER_STATUSES.DRAFT.id,
    title: "Brouillons",
    icon: KanbanSquare,
    color: "bg-gray-100",
    borderColor: "border-gray-300",
    textColor: "text-gray-700",
  },
  {
    id: OFFER_STATUSES.SENT.id,
    title: "Envoyées",
    icon: KanbanSquare,
    color: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
  },
  {
    id: OFFER_STATUSES.APPROVED.id,
    title: "Approuvées",
    icon: KanbanSquare,
    color: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-700",
  },
  {
    id: OFFER_STATUSES.LEASER_REVIEW.id,
    title: "Validation Bailleur",
    icon: KanbanSquare,
    color: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
  },
  {
    id: OFFER_STATUSES.FINANCED.id,
    title: "Financées",
    icon: KanbanSquare,
    color: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
  },
  {
    id: OFFER_STATUSES.REJECTED.id,
    title: "Rejetées",
    icon: KanbanSquare,
    color: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
  },
];

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
        <div className="flex overflow-x-auto pb-4 gap-4">
          {KANBAN_COLUMNS.map(column => (
            <div key={column.id} className="flex-shrink-0 w-80">
              <div className={cn(
                "rounded-t-lg p-3 flex items-center",
                column.color,
                column.textColor
              )}>
                <column.icon className="mr-2 h-5 w-5" />
                <h3 className="font-medium">{column.title}</h3>
                <span className="ml-2 bg-white/80 text-xs font-semibold rounded-full px-2 py-0.5">
                  {getOffersForColumn(column.id).length}
                </span>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[calc(100vh-280px)] max-h-[calc(100vh-280px)] overflow-y-auto rounded-b-lg p-2 transition-colors",
                      column.borderColor,
                      "border-l border-r border-b",
                      snapshot.isDraggingOver ? column.color : "bg-background"
                    )}
                  >
                    {getOffersForColumn(column.id).map((offer, index) => (
                      <Draggable
                        key={offer.id}
                        draggableId={offer.id}
                        index={index}
                        isDragDisabled={isUpdatingStatus || offer.converted_to_contract}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "mb-3",
                              snapshot.isDragging ? "opacity-80" : ""
                            )}
                          >
                            <OfferCard
                              offer={offer}
                              onDelete={() => onDeleteOffer(offer.id)}
                              onStatusChange={onStatusChange}
                              isUpdatingStatus={isUpdatingStatus}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default OffersKanban;
