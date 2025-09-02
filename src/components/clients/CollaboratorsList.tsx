import React, { useState, useEffect } from "react";
import { Collaborator } from "@/types/client";
import { getCollaboratorsByClientId, deleteCollaborator, createCollaboratorAccount } from "@/services/clientService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Edit, Trash2, Building, User, UserPlus, Briefcase } from "lucide-react";
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {collaborator.name}
                    {collaborator.is_primary && (
                      <Badge variant="secondary">Principal</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCollaborator(collaborator)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {collaborator.email && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCreateAccount(collaborator.id)}
                        disabled={creatingAccount === collaborator.id}
                      >
                        {creatingAccount === collaborator.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {!collaborator.is_primary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingCollaborator(collaborator)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Fonction</p>
                        <p className="font-medium">{collaborator.role || "Non spécifiée"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{collaborator.email || "Non renseigné"}</p>
                      </div>
                    </div>
                    
                    {collaborator.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Téléphone</p>
                          <p className="font-medium">{collaborator.phone}</p>
                        </div>
                      </div>
                    )}
                    
                    {collaborator.department && (
                      <div className="flex items-center gap-3">
                        <Building className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Département</p>
                          <p className="font-medium">{collaborator.department}</p>
                        </div>
                      </div>
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