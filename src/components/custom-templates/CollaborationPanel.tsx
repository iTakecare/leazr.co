import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Crown, Edit, Eye, Trash2 } from 'lucide-react';
import { templateCollaborationService } from '@/services/templateCollaborationService';
import { TemplateCollaborator } from '@/types/customPdfTemplate';
import { toast } from 'sonner';

interface CollaborationPanelProps {
  templateId: string;
}

export function CollaborationPanel({ templateId }: CollaborationPanelProps) {
  const [collaborators, setCollaborators] = useState<TemplateCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<TemplateCollaborator['role']>('editor');
  const [isAddingUser, setIsAddingUser] = useState(false);

  useEffect(() => {
    if (templateId && templateId !== 'temp') {
      loadCollaborators();
    } else {
      setLoading(false);
    }
  }, [templateId]);

  const loadCollaborators = async () => {
    if (!templateId || templateId === 'temp') {
      setLoading(false);
      return;
    }
    
    try {
      const data = await templateCollaborationService.getCollaborators(templateId);
      setCollaborators(data);
    } catch (error) {
      console.error('Error loading collaborators:', error);
      toast.error('Erreur lors du chargement des collaborateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollaborator = async () => {
    if (!newUserEmail.trim()) return;

    setIsAddingUser(true);
    try {
      // Note: Dans une vraie implémentation, vous devriez d'abord résoudre l'email vers un user_id
      // Pour l'instant, on simule avec un UUID fictif
      await templateCollaborationService.addCollaborator(
        templateId,
        'temp-user-id', // À remplacer par la vraie logique de résolution d'email
        newUserRole
      );
      
      toast.success('Collaborateur ajouté avec succès');
      setNewUserEmail('');
      loadCollaborators();
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast.error('Erreur lors de l\'ajout du collaborateur');
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleRoleChange = async (collaboratorId: string, newRole: TemplateCollaborator['role']) => {
    try {
      await templateCollaborationService.updateCollaboratorRole(collaboratorId, newRole);
      toast.success('Rôle mis à jour');
      loadCollaborators();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erreur lors de la mise à jour du rôle');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      await templateCollaborationService.removeCollaborator(collaboratorId);
      toast.success('Collaborateur supprimé');
      loadCollaborators();
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getRoleIcon = (role: TemplateCollaborator['role']) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'editor':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-500" />;
      case 'reviewer':
        return <Users className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: TemplateCollaborator['role']) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'outline';
      case 'reviewer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!templateId || templateId === 'temp') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Veuillez sauvegarder le template avant d'ajouter des collaborateurs.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Collaboration ({collaborators.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ajouter un collaborateur */}
        <div className="flex gap-2">
          <Input
            placeholder="Email du collaborateur"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            className="flex-1"
          />
          <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as TemplateCollaborator['role'])}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Éditeur</SelectItem>
              <SelectItem value="viewer">Lecteur</SelectItem>
              <SelectItem value="reviewer">Réviseur</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddCollaborator}
            disabled={isAddingUser || !newUserEmail.trim()}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>

        {/* Liste des collaborateurs */}
        <div className="space-y-2">
          {collaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {collaborator.user_id.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Utilisateur {collaborator.user_id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">
                    Ajouté le {new Date(collaborator.added_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(collaborator.role)} className="flex items-center gap-1">
                  {getRoleIcon(collaborator.role)}
                  {collaborator.role}
                </Badge>
                
                {collaborator.role !== 'owner' && (
                  <>
                    <Select 
                      value={collaborator.role} 
                      onValueChange={(value) => handleRoleChange(collaborator.id, value as TemplateCollaborator['role'])}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Éditeur</SelectItem>
                        <SelectItem value="viewer">Lecteur</SelectItem>
                        <SelectItem value="reviewer">Réviseur</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {collaborators.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun collaborateur pour ce template
          </div>
        )}
      </CardContent>
    </Card>
  );
}