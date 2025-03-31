
import React, { useEffect, useState } from "react";
import { Loader2, UserPlus, User, Mail, Phone, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collaborator } from "@/types/client";
import { getCollaboratorsByClientId } from "@/services/clientService";

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
                    <Badge variant="outline" className="mt-1 bg-primary/10 text-primary border-primary/20">
                      {collaborator.role}
                    </Badge>
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
  );
};

export default CollaboratorsList;
