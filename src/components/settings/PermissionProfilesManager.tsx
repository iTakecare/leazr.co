import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Shield, Plus, Edit, Trash2, Users, Settings } from "lucide-react";

type PermissionProfile = {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
};

type Permission = {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
};

type PermissionGroup = {
  [module: string]: Permission[];
};

const PermissionProfilesManager = () => {
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [permissions, setPermissions] = useState<PermissionGroup>({});
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PermissionProfile | null>(null);
  
  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchProfiles();
    fetchPermissions();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('permission_profiles')
        .select('*')
        .order('name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Erreur lors de la récupération des profils");
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module, action');

      if (error) throw error;

      // Grouper les permissions par module
      const grouped = (data || []).reduce((acc: PermissionGroup, perm: Permission) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push(perm);
        return acc;
      }, {});

      setPermissions(grouped);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!profileName.trim()) {
      toast.error("Le nom du profil est requis");
      return;
    }

    try {
      const { error } = await supabase
        .from('permission_profiles')
        .insert({
          name: profileName,
          description: profileDescription,
          permissions: selectedPermissions
        });

      if (error) throw error;

      toast.success("Profil créé avec succès");
      setShowCreateDialog(false);
      resetForm();
      fetchProfiles();
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Erreur lors de la création du profil");
    }
  };

  const handleEditProfile = async () => {
    if (!selectedProfile || !profileName.trim()) return;

    try {
      const { error } = await supabase
        .from('permission_profiles')
        .update({
          name: profileName,
          description: profileDescription,
          permissions: selectedPermissions
        })
        .eq('id', selectedProfile.id);

      if (error) throw error;

      toast.success("Profil mis à jour avec succès");
      setShowEditDialog(false);
      resetForm();
      fetchProfiles();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la mise à jour du profil");
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;

    try {
      const { error } = await supabase
        .from('permission_profiles')
        .delete()
        .eq('id', selectedProfile.id);

      if (error) throw error;

      toast.success("Profil supprimé avec succès");
      setShowDeleteDialog(false);
      fetchProfiles();
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast.error("Erreur lors de la suppression du profil");
    }
  };

  const openEditDialog = (profile: PermissionProfile) => {
    setSelectedProfile(profile);
    setProfileName(profile.name);
    setProfileDescription(profile.description || "");
    setSelectedPermissions(profile.permissions || []);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (profile: PermissionProfile) => {
    setSelectedProfile(profile);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setProfileName("");
    setProfileDescription("");
    setSelectedPermissions([]);
    setSelectedProfile(null);
  };

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions(prev => [...prev, permissionId]);
    } else {
      setSelectedPermissions(prev => prev.filter(id => id !== permissionId));
    }
  };

  const getModuleLabel = (module: string) => {
    const labels: { [key: string]: string } = {
      'catalog': 'Catalogue',
      'offers': 'Offres',
      'clients': 'Clients',
      'contracts': 'Contrats',
      'ambassadors': 'Ambassadeurs',
      'partners': 'Partenaires',
      'settings': 'Paramètres',
      'users': 'Utilisateurs',
      'dashboard': 'Tableau de bord',
      'analytics': 'Analytics'
    };
    return labels[module] || module;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'update': return 'bg-yellow-100 text-yellow-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'manage': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Chargement des profils...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Profils de permissions</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les profils de permissions prédéfinis pour faciliter l'attribution des droits.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau profil
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile) => (
            <TableRow key={profile.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{profile.name}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {profile.description}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {profile.permissions?.length || 0} permissions
                </Badge>
              </TableCell>
              <TableCell>
                {profile.is_system ? (
                  <Badge variant="secondary">Système</Badge>
                ) : (
                  <Badge variant="outline">Personnalisé</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => openEditDialog(profile)}
                    disabled={profile.is_system}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => openDeleteDialog(profile)}
                    disabled={profile.is_system}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create Profile Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un profil de permissions</DialogTitle>
            <DialogDescription>
              Définissez un nouveau profil avec les permissions appropriées.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du profil</Label>
                <Input
                  id="name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Ex: Gestionnaire commercial"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  placeholder="Description du profil..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Permissions</h4>
              {Object.entries(permissions).map(([module, modulePermissions]) => (
                <div key={module} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <h5 className="font-medium">{getModuleLabel(module)}</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-2 ml-6">
                    {modulePermissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Switch
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) => 
                            handlePermissionToggle(permission.id, checked)
                          }
                        />
                        <Badge className={getActionColor(permission.action)}>
                          {permission.action}
                        </Badge>
                        <span className="text-sm">{permission.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateProfile}>
              Créer le profil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le profil de permissions</DialogTitle>
            <DialogDescription>
              Modifiez les permissions du profil sélectionné.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Nom du profil</Label>
                <Input
                  id="editName"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Ex: Gestionnaire commercial"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  placeholder="Description du profil..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Permissions</h4>
              {Object.entries(permissions).map(([module, modulePermissions]) => (
                <div key={module} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <h5 className="font-medium">{getModuleLabel(module)}</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-2 ml-6">
                    {modulePermissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Switch
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) => 
                            handlePermissionToggle(permission.id, checked)
                          }
                        />
                        <Badge className={getActionColor(permission.action)}>
                          {permission.action}
                        </Badge>
                        <span className="text-sm">{permission.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditProfile}>
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Profile Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce profil de permissions ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          {selectedProfile && (
            <div className="py-4">
              <p>Vous allez supprimer le profil :</p>
              <p className="font-medium mt-2">{selectedProfile.name}</p>
              {selectedProfile.description && (
                <p className="text-sm text-muted-foreground">{selectedProfile.description}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteProfile}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermissionProfilesManager;