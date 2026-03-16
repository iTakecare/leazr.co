import React, { useState, useEffect } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { 
  collaboratorEquipmentService, 
  type EquipmentItem, 
  type CollaboratorEquipment 
} from "@/services/collaboratorEquipmentService";
import CollaboratorCreationDialog from "./CollaboratorCreationDialog";
import UnassignedEquipmentPanel from "./UnassignedEquipmentPanel";
import CollaboratorCard from "./CollaboratorCard";
import CollaboratorDetailModal from "./CollaboratorDetailModal";

interface EquipmentDragDropManagerProps {
  clientId: string;
  readOnly?: boolean;
  onDragStart?: (start: any) => void;
  onDragEnd?: (result: any) => void;
  draggedEquipment?: string | null;
}

const EquipmentDragDropManager: React.FC<EquipmentDragDropManagerProps> = ({
  clientId,
  readOnly = false,
}) => {
  const [collaboratorGroups, setCollaboratorGroups] = useState<CollaboratorEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorEquipment | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await collaboratorEquipmentService.getEquipmentByCollaborator(clientId);
      setCollaboratorGroups(data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      if (error instanceof Error && !error.message.includes('No rows')) {
        toast.error('Erreur lors du chargement des équipements');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const unassigned = collaboratorGroups.find(g => g.collaborator_id === 'unassigned');
  const collaborators = collaboratorGroups.filter(g => g.collaborator_id !== 'unassigned');

  const handleDragStart = () => setIsDragging(true);

  const handleDragEnd = async (result: any) => {
    setIsDragging(false);
    if (!result.destination || result.destination.droppableId.startsWith('contract-')) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    try {
      const equipment = collaboratorGroups
        .flatMap(group => group.equipment)
        .find(item => item.id === draggableId);

      if (!equipment) return;

      const newCollaboratorId = destination.droppableId === 'unassigned' ? null : destination.droppableId;
      
      await collaboratorEquipmentService.assignEquipment(
        equipment.id,
        equipment.equipment_type,
        newCollaboratorId
      );

      await fetchData();

      const collaboratorName = newCollaboratorId === null 
        ? 'Non assigné' 
        : collaborators.find(c => c.collaborator_id === newCollaboratorId)?.collaborator_name || 'Collaborateur';

      toast.success(`Équipement assigné à ${collaboratorName}`);
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipement');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
        <div className="col-span-2 h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          {/* Left: Unassigned equipment */}
          <div className="lg:col-span-1">
            <UnassignedEquipmentPanel
              equipment={unassigned?.equipment || []}
              readOnly={readOnly}
            />
          </div>

          {/* Right: Collaborators */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col border border-border bg-card">
              <CardHeader className="flex-shrink-0 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      Collaborateurs
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Glissez-déposez le matériel vers un collaborateur
                    </CardDescription>
                  </div>
                  {!readOnly && (
                    <CollaboratorCreationDialog 
                      clientId={clientId} 
                      onCollaboratorCreated={fetchData}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 pt-0">
                <div className="h-full overflow-y-auto space-y-3">
                  {collaborators.length > 0 ? (
                    collaborators.map(group => (
                      <CollaboratorCard
                        key={group.collaborator_id}
                        collaboratorId={group.collaborator_id}
                        collaboratorName={group.collaborator_name}
                        collaboratorEmail={group.collaborator_email}
                        equipment={group.equipment}
                        readOnly={readOnly}
                        isDragActive={isDragging}
                        onViewDetails={() => setSelectedCollaborator(group)}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Aucun collaborateur</p>
                      <p className="text-xs text-muted-foreground">Ajoutez un collaborateur pour assigner du matériel</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DragDropContext>

      {/* Collaborator detail modal */}
      {selectedCollaborator && (
        <CollaboratorDetailModal
          open={!!selectedCollaborator}
          onOpenChange={(open) => !open && setSelectedCollaborator(null)}
          collaboratorId={selectedCollaborator.collaborator_id}
          collaboratorName={selectedCollaborator.collaborator_name}
          collaboratorEmail={selectedCollaborator.collaborator_email}
          equipment={selectedCollaborator.equipment}
          onUpdate={fetchData}
        />
      )}
    </>
  );
};

export default EquipmentDragDropManager;
