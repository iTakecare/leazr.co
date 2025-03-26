
import React from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Contract, contractStatuses } from "@/services/contractService";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Send,
  FileText,
  Package,
  Truck,
  CheckCheck,
  Clock,
  Calendar,
  Building,
  User,
  MoreVertical,
  Banknote
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface ContractsKanbanProps {
  contracts: Contract[];
  onStatusChange: (contractId: string, newStatus: string) => Promise<void>;
  onAddTrackingInfo: (
    contractId: string,
    trackingNumber: string,
    estimatedDelivery?: string,
    carrier?: string
  ) => Promise<void>;
  isUpdatingStatus: boolean;
}

// Définition des colonnes
const KANBAN_COLUMNS = [
  {
    id: contractStatuses.CONTRACT_SENT,
    title: "Contrats Envoyés",
    icon: Send,
    color: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
  },
  {
    id: contractStatuses.CONTRACT_SIGNED,
    title: "Contrats Signés",
    icon: FileText,
    color: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
  },
  {
    id: contractStatuses.EQUIPMENT_ORDERED,
    title: "Matériel Commandé",
    icon: Package,
    color: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
  },
  {
    id: contractStatuses.DELIVERED,
    title: "Matériel Livré",
    icon: Truck,
    color: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
  },
  {
    id: contractStatuses.ACTIVE,
    title: "Contrats Actifs",
    icon: CheckCheck,
    color: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
  },
  {
    id: contractStatuses.COMPLETED,
    title: "Contrats Terminés",
    icon: Clock,
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
  // Récupérer les contrats pour une colonne donnée
  const getContractsForColumn = (columnId: string) => {
    return contracts.filter(contract => contract.status === columnId);
  };

  // Gérer la fin d'un glisser-déposer
  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    // Si pas de destination ou même source et destination, ne rien faire
    if (!destination || (destination.droppableId === source.droppableId)) {
      return;
    }

    // Si la colonne de destination est différente, changer le statut
    await onStatusChange(draggableId, destination.droppableId);
  };

  // Formatter une date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  // Préparer le prochain statut possible pour un contrat
  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case contractStatuses.CONTRACT_SENT:
        return contractStatuses.CONTRACT_SIGNED;
      case contractStatuses.CONTRACT_SIGNED:
        return contractStatuses.EQUIPMENT_ORDERED;
      case contractStatuses.EQUIPMENT_ORDERED:
        return contractStatuses.DELIVERED;
      case contractStatuses.DELIVERED:
        return contractStatuses.ACTIVE;
      case contractStatuses.ACTIVE:
        return contractStatuses.COMPLETED;
      default:
        return null;
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex overflow-x-auto pb-4 gap-4 py-1 px-1">
        {KANBAN_COLUMNS.map(column => (
          <div key={column.id} className="flex-shrink-0 w-72 md:w-80">
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
                          <Card className="overflow-hidden border shadow-sm">
                            <CardContent className="p-0">
                              <div className="bg-muted/30 p-3">
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-medium text-sm flex items-center truncate">
                                    <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                    {contract.client_name}
                                  </h4>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {getNextStatus(contract.status) && (
                                        <DropdownMenuItem 
                                          onClick={() => onStatusChange(contract.id, getNextStatus(contract.status)!)}
                                          disabled={isUpdatingStatus}
                                        >
                                          Passer à l'étape suivante
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDate(contract.created_at)}
                                </div>
                              </div>
                              
                              <div className="p-3 space-y-2">
                                <div className="flex justify-between items-center">
                                  <div className="text-xs text-muted-foreground">Matériel</div>
                                  <div className="text-xs font-medium truncate max-w-[180px]">
                                    {contract.equipment_description || "Non spécifié"}
                                  </div>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <div className="text-xs text-muted-foreground flex items-center">
                                    <Building className="h-3 w-3 mr-1" />
                                    Bailleur
                                  </div>
                                  <div className="text-xs font-medium flex items-center">
                                    {contract.leaser_logo && (
                                      <img 
                                        src={contract.leaser_logo} 
                                        alt={contract.leaser_name} 
                                        className="w-3 h-3 mr-1 rounded-full" 
                                      />
                                    )}
                                    {contract.leaser_name}
                                  </div>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <div className="text-xs text-muted-foreground flex items-center">
                                    <Banknote className="h-3 w-3 mr-1" />
                                    Mensualité
                                  </div>
                                  <div className="text-xs font-medium">
                                    {formatCurrency(contract.monthly_payment)}
                                  </div>
                                </div>
                                
                                {contract.tracking_number && (
                                  <div className="flex justify-between items-center">
                                    <div className="text-xs text-muted-foreground flex items-center">
                                      <Truck className="h-3 w-3 mr-1" />
                                      Suivi
                                    </div>
                                    <div className="text-xs font-medium">
                                      {contract.tracking_number}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter className="p-2 bg-muted/20 border-t flex justify-center">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  column.color,
                                  column.textColor,
                                  "border-" + column.borderColor
                                )}
                              >
                                <column.icon className="h-3 w-3 mr-1" />
                                {column.title}
                              </Badge>
                            </CardFooter>
                          </Card>
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
  );
};

export default ContractsKanban;
