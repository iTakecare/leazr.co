import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GripVertical, X, HelpCircle, Split, Package, Users, MapPin, User, Hash } from "lucide-react";
import { toast } from "sonner";
import { 
  divideEquipment, 
  assignIndividualEquipment, 
  getContractEquipmentWithIndividuals, 
  ContractEquipment 
} from "@/services/equipmentDivisionService";
import { supabase } from "@/integrations/supabase/client";
import CollaboratorCreationDialog from "@/components/equipment/CollaboratorCreationDialog";

interface ContractEquipmentDragDropManagerProps {
  contractId: string;
  readOnly?: boolean;
}

interface Collaborator {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  department?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

interface CollaboratorWithEquipment extends Collaborator {
  equipment: ContractEquipment[];
}

const ContractEquipmentDragDropManager: React.FC<ContractEquipmentDragDropManagerProps> = ({
  contractId,
  readOnly = false
}) => {
  const [unassignedEquipment, setUnassignedEquipment] = useState<ContractEquipment[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorWithEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedEquipment, setDraggedEquipment] = useState<ContractEquipment | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [equipmentToDivide, setEquipmentToDivide] = useState<ContractEquipment | null>(null);
  const [clientId, setClientId] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupérer tous les équipements du contrat
      const equipments = await getContractEquipmentWithIndividuals(contractId);
      
      // Récupérer les collaborateurs du contrat
      const { data: contractData } = await supabase
        .from('contracts')
        .select('client_id')
        .eq('id', contractId)
        .single();

      if (!contractData) {
        throw new Error('Contrat non trouvé');
      }

      setClientId(contractData.client_id);

      const { data: collaboratorsData } = await supabase
        .from('collaborators')
        .select('*')
        .eq('client_id', contractData.client_id);

      // Séparer les équipements assignés et non assignés
      const unassigned: ContractEquipment[] = [];
      const equipmentByCollaborator: Record<string, ContractEquipment[]> = {};

      equipments.forEach(equipment => {
        if (equipment.collaborator_id) {
          if (!equipmentByCollaborator[equipment.collaborator_id]) {
            equipmentByCollaborator[equipment.collaborator_id] = [];
          }
          equipmentByCollaborator[equipment.collaborator_id].push(equipment);
        } else {
          unassigned.push(equipment);
        }
      });

      // Créer la liste des collaborateurs avec leurs équipements
      const collaboratorsWithEquipment: CollaboratorWithEquipment[] = (collaboratorsData || []).map(collab => ({
        ...collab,
        equipment: equipmentByCollaborator[collab.id] || []
      }));

      setUnassignedEquipment(unassigned);
      setCollaborators(collaboratorsWithEquipment);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des équipements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Vérifier si c'est la première fois
    const hasSeenTutorial = localStorage.getItem('equipment-division-tutorial');
    if (!hasSeenTutorial) {
      setTimeout(() => setShowHelp(true), 1000);
    }
  }, [contractId]);

  const handleDivideEquipment = async (equipment: ContractEquipment) => {
    if (equipment.is_individual || equipment.quantity <= 1) {
      toast.error("Cet équipement ne peut pas être divisé");
      return;
    }
    setEquipmentToDivide(equipment);
  };

  const confirmDivideEquipment = async () => {
    if (!equipmentToDivide) return;

    try {
      await divideEquipment({
        equipmentId: equipmentToDivide.id,
        serialNumbers: equipmentToDivide.serial_number ? 
          equipmentToDivide.serial_number.split(',').map(s => s.trim()) : []
      });
      
      toast.success(`Équipement divisé en ${equipmentToDivide.quantity} équipements individuels`);
      setEquipmentToDivide(null);
      await fetchData();
    } catch (error) {
      console.error('Error dividing equipment:', error);
      toast.error("Erreur lors de la division de l'équipement");
    }
  };

  const dismissTutorial = () => {
    setShowHelp(false);
    localStorage.setItem('equipment-division-tutorial', 'seen');
  };

  const onDragStart = (start: any) => {
    const equipment = [...unassignedEquipment, ...collaborators.flatMap(c => c.equipment)]
      .find(item => item.id === start.draggableId);
    setDraggedEquipment(equipment || null);
  };

  const onDragEnd = async (result: DropResult) => {
    setDraggedEquipment(null);
    
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const newCollaboratorId = destination.droppableId === 'unassigned' ? null : destination.droppableId;
    
    try {
      await assignIndividualEquipment(draggableId, newCollaboratorId);
      
      await fetchData();
      toast.success(
        newCollaboratorId ? 'Équipement assigné avec succès' : 'Équipement désassigné avec succès'
      );
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipement');
    }
  };

  const formatSerialNumbers = (equipment: ContractEquipment) => {
    if (equipment.individual_serial_number) {
      return equipment.individual_serial_number;
    }
    
    if (equipment.serial_number) {
      const numbers = equipment.serial_number.split(',').map(s => s.trim()).filter(Boolean);
      if (numbers.length > 3) {
        return `${numbers.slice(0, 3).join(', ')}... (+${numbers.length - 3})`;
      }
      return numbers.join(', ');
    }
    
    return null;
  };

  const renderEquipmentCard = (item: ContractEquipment, index: number, isDragging: boolean = false) => (
    <div
      className={`p-3 rounded-md border transition-all ${
        isDragging
          ? 'shadow-lg border-primary bg-background transform rotate-1'
          : 'border-border bg-background hover:bg-muted/50 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm truncate">{item.title}</p>
                {item.is_individual && (
                  <Badge variant="secondary" className="text-xs">Individuel</Badge>
                )}
                {!item.is_individual && item.quantity > 1 && (
                  <Badge variant="outline" className="text-xs">Groupe ({item.quantity})</Badge>
                )}
              </div>
              
              {/* Numéros de série améliorés */}
              {formatSerialNumbers(item) && (
                <div className="flex items-center gap-1 mb-1">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatSerialNumbers(item)}
                  </p>
                </div>
              )}
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Qté: {item.quantity}</span>
                <span>•</span>
                <span>{item.purchase_price}€</span>
              </div>
            </div>
            
            {item.monthly_payment && (
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {item.monthly_payment}€/mois
              </Badge>
            )}
          </div>
          
          {/* Contrôles d'attribution */}
          {!readOnly && (
            <div className="flex items-center gap-2 mt-2">
              {/* Bouton pour diviser si nécessaire */}
              {!item.is_individual && item.quantity > 1 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDivideEquipment(item)}
                      className="h-7 w-7 p-0 hover:bg-primary/20"
                    >
                      <Split className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Diviser en équipements individuels</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-muted animate-pulse rounded-lg"></div>
        <div className="h-96 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Aide tutoriel */}
        {showHelp && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">Attribution individuelle d'équipements</h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <p><strong>Division :</strong> Cliquez sur <Split className="inline h-3 w-3 mx-1" /> pour diviser un équipement en plusieurs équipements individuels</p>
                    <p><strong>Attribution :</strong> Glissez les équipements de la colonne gauche vers les collaborateurs</p>
                    <p><strong>Organisation :</strong> Interface en deux colonnes pour une meilleure visibilité</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={dismissTutorial}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interface en deux colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne gauche : Équipements non assignés */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Équipements disponibles
                    <Badge variant="outline">{unassignedEquipment.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Équipements en attente d'attribution
                  </CardDescription>
                </div>
                {!readOnly && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHelp(!showHelp)}
                      >
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Afficher/masquer l'aide</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <Droppable droppableId="unassigned" isDropDisabled={readOnly}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[400px] p-4 border-2 border-dashed rounded-lg transition-all duration-200 ${
                        snapshot.isDraggingOver
                          ? 'border-primary bg-primary/5 shadow-inner'
                          : draggedEquipment ? 'border-muted-foreground/30 bg-muted/20' : 'border-muted-foreground/20'
                      }`}
                    >
                      {unassignedEquipment.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                          <Package className="h-8 w-8 mb-2" />
                          <p className="text-sm">Aucun équipement disponible</p>
                          <p className="text-xs">Tous les équipements sont assignés</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {unassignedEquipment.map((item, index) => (
                            <Draggable 
                              key={item.id} 
                              draggableId={item.id} 
                              index={index}
                              isDragDisabled={readOnly}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`${!readOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                >
                                  <div className="flex items-center gap-2">
                                    {!readOnly && (
                                      <div
                                        {...provided.dragHandleProps}
                                        className="flex-shrink-0"
                                      >
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="p-1 rounded hover:bg-muted/50 cursor-grab active:cursor-grabbing">
                                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Glissez vers un collaborateur</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      {renderEquipmentCard(item, index, snapshot.isDragging)}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </CardContent>
          </Card>

          {/* Colonne droite : Collaborateurs et leurs équipements */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Collaborateurs
                    <Badge variant="outline">{collaborators.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Attribution des équipements par collaborateur
                  </CardDescription>
                </div>
                {!readOnly && clientId && (
                  <CollaboratorCreationDialog 
                    clientId={clientId} 
                    onCollaboratorCreated={fetchData}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {collaborators.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border-2 border-dashed rounded-lg">
                      <User className="h-8 w-8 mb-2" />
                      <p className="text-sm">Aucun collaborateur</p>
                      <p className="text-xs">Ajoutez des collaborateurs pour l'attribution</p>
                    </div>
                  ) : (
                    collaborators.map((collaborator) => (
                      <Droppable 
                        key={collaborator.id} 
                        droppableId={collaborator.id}
                        isDropDisabled={readOnly}
                      >
                        {(provided, snapshot) => (
                          <div
                            className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                              snapshot.isDraggingOver
                                ? 'border-primary bg-primary/5 border-dashed shadow-lg'
                                : draggedEquipment ? 'border-dashed border-muted-foreground/30 bg-muted/20' : 'border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <h3 className="font-medium">{collaborator.name}</h3>
                                  <Badge variant="outline" className="text-xs">
                                    {collaborator.equipment.length}
                                  </Badge>
                                </div>
                                
                                <div className="text-sm text-muted-foreground space-y-1">
                                  {collaborator.email && (
                                    <p className="truncate">{collaborator.email}</p>
                                  )}
                                  {collaborator.role && (
                                    <p>{collaborator.role}</p>
                                  )}
                                  {(collaborator.address || collaborator.city) && (
                                    <div className="flex items-start gap-1">
                                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      <p className="text-xs">
                                        {[collaborator.address, collaborator.postal_code, collaborator.city]
                                          .filter(Boolean)
                                          .join(', ')}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="min-h-[100px]"
                            >
                              {collaborator.equipment.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-20 text-muted-foreground border border-dashed rounded">
                                  <Package className="h-5 w-5 mb-1" />
                                  <p className="text-xs">Glissez un équipement ici</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {collaborator.equipment.map((item, index) => (
                                    <Draggable 
                                      key={item.id} 
                                      draggableId={item.id} 
                                      index={index}
                                      isDragDisabled={readOnly}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={`${!readOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                        >
                                          <div className="flex items-center gap-2">
                                            {!readOnly && (
                                              <div
                                                {...provided.dragHandleProps}
                                                className="flex-shrink-0"
                                              >
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <div className="p-1 rounded hover:bg-muted/50 cursor-grab active:cursor-grabbing">
                                                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                                                    </div>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>Glissez pour déplacer</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </div>
                                            )}
                                            <div className="flex-1">
                                              {renderEquipmentCard(item, index, snapshot.isDragging)}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                </div>
                              )}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    ))
                  )}
                </div>
              </DragDropContext>
            </CardContent>
          </Card>
        </div>

        {/* Dialog de confirmation division */}
        <Dialog open={!!equipmentToDivide} onOpenChange={() => setEquipmentToDivide(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Split className="h-5 w-5" />
                Diviser l'équipement
              </DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir diviser cet équipement en {equipmentToDivide?.quantity} équipements individuels ?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {equipmentToDivide && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium">{equipmentToDivide.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Quantité: {equipmentToDivide.quantity} • Prix: {equipmentToDivide.purchase_price}€
                  </p>
                  {formatSerialNumbers(equipmentToDivide) && (
                    <div className="flex items-center gap-1 mt-1">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatSerialNumbers(equipmentToDivide)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEquipmentToDivide(null)}>
                Annuler
              </Button>
              <Button onClick={confirmDivideEquipment}>
                Diviser l'équipement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default ContractEquipmentDragDropManager;