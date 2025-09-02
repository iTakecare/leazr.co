import React, { useState, useEffect } from "react";
import { Collaborator } from "@/types/client";
import { getCollaboratorsByClientId, deleteCollaborator, createCollaboratorAccount } from "@/services/clientService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Edit2, Trash2, Building2, User, UserPlus, Crown } from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EditCollaboratorModal from "./EditCollaboratorModal";

interface CollaboratorsListProps {
  clientId: string;
  initialCollaborators?: Collaborator[];
  onRefreshNeeded?: () => void;
}

const CollaboratorsList: React.FC<CollaboratorsListProps> = ({
  clientId,
  initialCollaborators = [],
  onRefreshNeeded
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators);
  const [loading, setLoading] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [deletingCollaborator, setDeletingCollaborator] = useState<Collaborator | null>(null);
  const [creatingAccount, setCreatingAccount] = useState<string | null>(null);

  const fetchCollaborators = async () => {
    setLoading(true);
    try {
      const data = await getCollaboratorsByClientId(clientId);
      setCollaborators(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des collaborateurs:", error);
      toast.error("Erreur lors de la récupération des collaborateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCollaborators.length === 0) {
      fetchCollaborators();
    }
  }, [clientId]);

  useEffect(() => {
    setCollaborators(initialCollaborators);
  }, [initialCollaborators]);

  const handleEditSuccess = () => {
    setEditingCollaborator(null);
    fetchCollaborators();
    if (onRefreshNeeded) {
      onRefreshNeeded();
    }
  };

  const handleCreateAccount = async (collaboratorId: string) => {
    setCreatingAccount(collaboratorId);
    try {
      const result = await createCollaboratorAccount(collaboratorId);
      if (result.success) {
        toast.success(result.message);
        fetchCollaborators(); // Rafraîchir pour afficher les nouvelles données
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Erreur lors de la création du compte");
      console.error(error);
    } finally {
      setCreatingAccount(null);
    }
  };

  const handleDeleteCollaborator = async (collaboratorId: string) => {
    try {
      await deleteCollaborator(collaboratorId);
      toast.success("Collaborateur supprimé avec succès");
      setDeletingCollaborator(null);
      fetchCollaborators();
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression du collaborateur");
      console.error(error);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!loading && collaborators.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun collaborateur trouvé pour ce client.</p>
          </div>
        )}

        {!loading && collaborators.length > 0 && (
          <div className="space-y-4">
            {collaborators.map((collaborator) => (
              <Card key={collaborator.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {collaborator.name}
                        {collaborator.is_primary && (
                          <Badge variant="default" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Principal
                          </Badge>
                        )}
                      </CardTitle>
                      {collaborator.role && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {collaborator.role}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {collaborator.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{collaborator.email}</span>
                    </div>
                  )}
                  
                  {collaborator.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{collaborator.phone}</span>
                    </div>
                  )}
                  
                  {collaborator.department && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{collaborator.department}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingCollaborator(collaborator)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Modifier
                    </Button>
                        
                        {collaborator.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateAccount(collaborator.id)}
                            disabled={creatingAccount === collaborator.id}
                          >
                            {creatingAccount === collaborator.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4 mr-1" />
                            )}
                            Créer compte
                          </Button>
                        )}
                        
                        {!collaborator.is_primary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingCollaborator(collaborator)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'édition */}
      <EditCollaboratorModal
        collaborator={editingCollaborator}
        isOpen={editingCollaborator !== null}
        onClose={() => setEditingCollaborator(null)}
        onSave={handleEditSuccess}
      />

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deletingCollaborator !== null} onOpenChange={() => setDeletingCollaborator(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le collaborateur "{deletingCollaborator?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCollaborator && handleDeleteCollaborator(deletingCollaborator.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CollaboratorsList;