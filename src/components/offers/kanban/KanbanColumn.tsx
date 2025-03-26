
import React from "react";
import { Droppable } from "react-beautiful-dnd";
import { cn } from "@/lib/utils";
import { DraggableOfferCard } from "./DraggableOfferCard";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { LucideIcon } from "lucide-react";

interface KanbanColumnProps {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  borderColor: string;
  textColor: string;
  offers: Offer[];
  onDeleteOffer: (id: string) => Promise<void>;
  onStatusChange: (offerId: string, newStatus: string) => Promise<void>;
  isUpdatingStatus: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  icon: Icon,
  color,
  borderColor,
  textColor,
  offers,
  onDeleteOffer,
  onStatusChange,
  isUpdatingStatus,
}) => {
  return (
    <div className="flex-shrink-0 w-72 md:w-80 snap-start">
      <div className={cn(
        "rounded-t-lg p-3 flex items-center",
        color,
        textColor
      )}>
        <Icon className="mr-2 h-5 w-5" />
        <h3 className="font-medium">{title}</h3>
        <span className="ml-2 bg-white/80 text-xs font-semibold rounded-full px-2 py-0.5">
          {offers.length}
        </span>
      </div>
      
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "min-h-[calc(100vh-280px)] max-h-[calc(100vh-280px)] overflow-y-auto rounded-b-lg p-2 transition-colors",
              borderColor,
              "border-l border-r border-b",
              snapshot.isDraggingOver ? color : "bg-background"
            )}
          >
            {offers.map((offer, index) => (
              <DraggableOfferCard
                key={offer.id}
                offer={offer}
                index={index}
                onDelete={() => onDeleteOffer(offer.id)}
                onStatusChange={onStatusChange}
                isUpdatingStatus={isUpdatingStatus}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
