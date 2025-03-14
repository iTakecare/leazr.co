
import React from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Contract, contractStatuses } from "@/services/contractService";
import ContractCard from "@/components/contracts/ContractCard";
import { KanbanSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractsKanbanProps {
  contracts: Contract[];
  onStatusChange: (contractId: string, newStatus: string) => Promise<void>;
  onAddTrackingInfo: (contractId: string, trackingNumber: string, estimatedDelivery?: string, carrier?: string) => Promise<void>;
  isUpdatingStatus: boolean;
}

// Définition des colonnes du Kanban pour les contrats
const KANBAN_COLUMNS = [
  {
    id: contractStatuses.CONTRACT_SENT,
    title: "Contrats envoyés",
    icon: KanbanSquare,
    color: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
  },
  {
    id: contractStatuses.CONTRACT_SIGNED,
    title: "Contrats signés",
    icon: KanbanSquare,
    color: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-700",
  },
  {
    id: contractStatuses.EQUIPMENT_ORDERED,
    title: "Matériel commandé",
    icon: KanbanSquare,
    color: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
  },
  {
    id: contractStatuses.DELIVERED,
    title: "Livré",
    icon: KanbanSquare,
    color: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
  },
  {
    id: contractStatuses.ACTIVE,
    title: "Actif",
    icon: KanbanSquare,
    color: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
  },
  {
    id: contractStatuses.COMPLETED,
    title: "Terminé",
    icon: KanbanSquare,
    color: "bg-gray-50",
    borderColor: "border-gray-200",
    textColor: "text-gray-700",
  },
];

const ContractsKanban: React.FC<ContractsKanbanProps> = ({
  contracts,
  onStatusChange,
  onAddTrackingInfo,
  isUpdatingStatus,
}) => {
  // Répartir les contrats par colonne
  const getContractsForColumn = (columnId: string) => {
    return contracts.filter(contract => contract.status === columnId);
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
                  {getContractsForColumn(column.id).length}
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
                    {getContractsForColumn(column.id).map((contract, index) => (
                      <Draggable
                        key={contract.id}
                        draggableId={contract.id}
                        index={index}
                        isDragDisabled={isUpdatingStatus}
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
                            <ContractCard
                              contract={contract}
                              onStatusChange={onStatusChange}
                              onAddTrackingInfo={onAddTrackingInfo}
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

export default ContractsKanban;
