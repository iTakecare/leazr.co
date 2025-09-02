
import React, { useEffect, useState } from "react";
import { Loader2, UserPlus, User, Mail, Phone, Briefcase, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collaborator } from "@/types/client";
import { getCollaboratorsByClientId, deleteCollaborator } from "@/services/clientService";
import EditCollaboratorForm from "./EditCollaboratorForm";
import { toast } from "sonner";

interface CollaboratorsListProps {
  clientId: string;
  initialCollaborators?: Collaborator[];
  onRefreshNeeded?: () => void;
}

const CollaboratorsList = ({ 
  clientId, 
  initialCollaborators,
  onRefreshNeeded
}: CollaboratorsListProps) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators || []);
  const [loading, setLoading] = useState(!initialCollaborators);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [deletingCollaboratorId, setDeletingCollaboratorId] = useState<string | null>(null);

  const fetchCollaborators = async () => {
    setLoading(true);
    try {
      const data = await getCollaboratorsByClientId(clientId);
      setCollaborators(data);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialCollaborators) {
      fetchCollaborators();
    }
  }, [clientId, initialCollaborators]);

  // Update collaborators when initialCollaborators changes
  useEffect(() => {
    if (initialCollaborators) {
      setCollaborators(initialCollaborators);
      setLoading(false);
    }
  }, [initialCollaborators]);

  const handleEditSuccess = () => {
    setEditingCollaborator(null);
    fetchCollaborators();
    onRefreshNeeded?.();
  };

  const handleDeleteCollaborator = async (collaboratorId: string) => {
    try {
      await deleteCollaborator(collaboratorId);
      toast.success("Collaborateur supprimé avec succès");
      setDeletingCollaboratorId(null);
      fetchCollaborators();
      onRefreshNeeded?.();
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error);
      toast.error(error.message || "Erreur lors de la suppression du collaborateur");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Chargement des collaborateurs...</span>
      </div>
    );
  }

  if (collaborators.length === 0) {
    return (
      <div className="text-center py-8">
        <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">Aucun collaborateur ajouté pour ce client</p>
        <p className="text-sm text-muted-foreground">Utilisez le formulaire ci-dessus pour ajouter des collaborateurs</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {collaborators.map((collaborator) => (
          <Card key={collaborator.id} className="overflow-hidden border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-grow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-lg">{collaborator.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {collaborator.role}
                        </Badge>
                        {collaborator.is_primary && (
                          <Badge variant="secondary" className="text-xs">
                            Principal
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingCollaborator(collaborator)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {!collaborator.is_primary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingCollaboratorId(collaborator.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {collaborator.department && (
                      <div className="flex items-center text-muted-foreground">
                        <Briefcase className="h-3.5 w-3.5 mr-2" />
                        <span>{collaborator.department}</span>
                      </div>
                    )}
                    {collaborator.email && (
                      <div className="flex items-center text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 mr-2" />
                        <a href={`mailto:${collaborator.email}`} className="hover:text-primary">
                          {collaborator.email}
                        </a>
                      </div>
                    )}
                    {collaborator.phone && (
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 mr-2" />
                        <a href={`tel:${collaborator.phone}`} className="hover:text-primary">
                          {collaborator.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog pour éditer un collaborateur */}
      <Dialog open={!!editingCollaborator} onOpenChange={() => setEditingCollaborator(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le collaborateur</DialogTitle>
          </DialogHeader>
          {editingCollaborator && (
            <EditCollaboratorForm
              collaborator={editingCollaborator}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingCollaborator(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation pour supprimer un collaborateur */}
      <AlertDialog open={!!deletingCollaboratorId} onOpenChange={() => setDeletingCollaboratorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce collaborateur ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCollaboratorId && handleDeleteCollaborator(deletingCollaboratorId)}
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
