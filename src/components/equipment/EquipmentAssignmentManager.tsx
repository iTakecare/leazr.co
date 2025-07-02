import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Package, ArrowRight, History } from "lucide-react";
import { 
  collaboratorEquipmentService, 
  type EquipmentItem, 
  type CollaboratorEquipment 
} from "@/services/collaboratorEquipmentService";

interface EquipmentAssignmentManagerProps {
  clientId: string;
  readOnly?: boolean;
}

const EquipmentAssignmentManager: React.FC<EquipmentAssignmentManagerProps> = ({
  clientId,
  readOnly = false
}) => {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [collaboratorGroups, setCollaboratorGroups] = useState<CollaboratorEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [equipmentData, collaboratorData] = await Promise.all([
        collaboratorEquipmentService.getClientEquipment(clientId),
        collaboratorEquipmentService.getEquipmentByCollaborator(clientId)
      ]);
      
      setEquipment(equipmentData);
      setCollaboratorGroups(collaboratorData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des équipements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const handleAssignEquipment = async (
    equipmentId: string, 
    equipmentType: 'offer' | 'contract',
    collaboratorId: string | null
  ) => {
    setAssigning(equipmentId);
    try {
      await collaboratorEquipmentService.assignEquipment(
        equipmentId, 
        equipmentType, 
        collaboratorId === 'unassigned' ? null : collaboratorId
      );
      
      await fetchData(); // Recharger les données
      toast.success(
        collaboratorId === 'unassigned' 
          ? 'Équipement désassigné avec succès'
          : 'Équipement assigné avec succès'
      );
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipement');
    } finally {
      setAssigning(null);
    }
  };

  const getCollaboratorOptions = () => {
    const assignedCollaborators = collaboratorGroups.filter(c => c.collaborator_id !== 'unassigned');
    return [
      { id: 'unassigned', name: 'Non assigné', email: '' },
      ...assignedCollaborators.map(c => ({ 
        id: c.collaborator_id, 
        name: c.collaborator_name, 
        email: c.collaborator_email 
      }))
    ];
  };

  const getEquipmentTypeColor = (type: 'offer' | 'contract') => {
    return type === 'offer' 
      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' 
      : 'bg-green-100 text-green-800 hover:bg-green-100';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vue par collaborateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Équipements par collaborateur
          </CardTitle>
          <CardDescription>
            Vue d'ensemble des équipements assignés à chaque collaborateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {collaboratorGroups.map((group) => (
              <div key={group.collaborator_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{group.collaborator_name}</h3>
                    {group.collaborator_email && (
                      <p className="text-sm text-muted-foreground">{group.collaborator_email}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {group.equipment.length} équipement{group.equipment.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {group.equipment.length > 0 ? (
                  <div className="grid gap-2">
                    {group.equipment.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{item.title}</span>
                            <Badge className={getEquipmentTypeColor(item.equipment_type)}>
                              {item.equipment_type === 'offer' ? 'Offre' : 'Contrat'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.source_name}
                            {item.serial_number && ` • SN: ${item.serial_number}`}
                          </p>
                        </div>
                        
                        {!readOnly && (
                          <Select
                            value={item.collaborator_id || 'unassigned'}
                            onValueChange={(value) => handleAssignEquipment(
                              item.id, 
                              item.equipment_type, 
                              value
                            )}
                            disabled={assigning === item.id}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Réassigner à..." />
                            </SelectTrigger>
                            <SelectContent>
                              {getCollaboratorOptions().map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Aucun équipement assigné
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vue par équipement (liste complète) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Tous les équipements
          </CardTitle>
          <CardDescription>
            Liste complète des équipements avec possibilité d'assignation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {equipment.length > 0 ? (
            <div className="space-y-3">
              {equipment.map((item) => {
                const assignedCollaborator = collaboratorGroups
                  .find(c => c.collaborator_id === item.collaborator_id);
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.title}</span>
                        <Badge className={getEquipmentTypeColor(item.equipment_type)}>
                          {item.equipment_type === 'offer' ? 'Offre' : 'Contrat'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.source_name}
                        {item.serial_number && ` • SN: ${item.serial_number}`}
                      </p>
                      {assignedCollaborator && (
                        <div className="flex items-center gap-1 mt-2 text-sm">
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span className="text-primary font-medium">
                            {assignedCollaborator.collaborator_name}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {!readOnly && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={item.collaborator_id || 'unassigned'}
                          onValueChange={(value) => handleAssignEquipment(
                            item.id, 
                            item.equipment_type, 
                            value
                          )}
                          disabled={assigning === item.id}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Assigner à..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getCollaboratorOptions().map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Ouvrir un modal d'historique
                            toast.info('Fonctionnalité d\'historique à venir');
                          }}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Aucun équipement trouvé</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EquipmentAssignmentManager;