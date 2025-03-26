
import React from "react";
import { Draggable } from "react-beautiful-dnd";
import { cn } from "@/lib/utils";
import OfferCard from "../OfferCard";
import { Offer } from "@/hooks/offers/useFetchOffers";

interface DraggableOfferCardProps {
  offer: Offer;
  index: number;
  onDelete: () => void;
  onStatusChange: (offerId: string, newStatus: string) => Promise<void>;
  isUpdatingStatus: boolean;
}

export const DraggableOfferCard: React.FC<DraggableOfferCardProps> = ({
  offer,
  index,
  onDelete,
  onStatusChange,
  isUpdatingStatus,
}) => {
  return (
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
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            isUpdatingStatus={isUpdatingStatus}
          />
        </div>
      )}
    </Draggable>
  );
};
