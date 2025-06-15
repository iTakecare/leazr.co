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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Plus, Edit, Trash2, Users, Settings } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type PermissionProfile = {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
  created_at: string;
};

type Permission = {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
};

const PermissionProfilesManager = () => {
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PermissionProfile | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    selectedPermissions: [] as string[]
  });

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
      setPermissions(data || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Erreur lors de la récupération des permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!formData.name.trim()) {
      toast.error("Le nom du profil est requis");
      return;
    }

    try {
      const { error } = await supabase
        .from('permission_profiles')
        .insert({
          name: formData.name,
          description: formData.description,
          permissions: formData.selectedPermissions
        });

      if (error) throw error;
      
      toast.success("Profil de permissions créé avec succès");
      setShowCreateDialog(false);
      resetForm();
      fetchProfiles();
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Erreur lors de la création du profil");
    }
  };

  const handleEditProfile = async () => {
    if (!selectedProfile || !formData.name.trim()) return;

    try {
      const { error } = await supabase
        .from('permission_profiles')
        .update({
          name: formData.name,
          description: formData.description,
          permissions: formData.selectedPermissions
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
      setSelectedProfile(null);
      fetchProfiles();
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast.error("Erreur lors de la suppression du profil");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      selectedPermissions: []
    });
    setSelectedProfile(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (profile: PermissionProfile) => {
    setSelectedProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || "",
      selectedPermissions: profile.permissions || []
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (profile: PermissionProfile) => {
    setSelectedProfile(profile);
    setShowDeleteDialog(true);
  };

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedPermissions: checked
        ? [...prev.selectedPermissions, permissionId]
        : prev.selectedPermissions.filter(id => id !== permissionId)
    }));
  };

  const getPermissionsByModule = () => {
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
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
    return <div className="py-8 text-center">Chargement des profils de permissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Profils de permissions</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Gérer les profils types avec des ensembles de permissions prédéfinies
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau profil
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>{profile.name}</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {profile.description || "Aucune description"}
                  </CardDescription>
                </div>
                {profile.is_system && (
                  <Badge variant="secondary" className="text-xs">
                    Système
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {profile.permissions?.length || 0} permission(s)
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openEditDialog(profile)}
                    disabled={profile.is_system}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                  {!profile.is_system && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openDeleteDialog(profile)}
                    >
                      <Trash2 className="h-3 w-3 mr-1 text-destructive" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Profile Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un profil de permissions</DialogTitle>
            <DialogDescription>
              Définissez un nouveau profil avec des permissions spécifiques
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du profil</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Gestionnaire commercial"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                value={formData.description} 
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du profil et de ses responsabilités"
              />
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              {Object.entries(getPermissionsByModule()).map(([module, modulePermissions]) => (
                <div key={module} className="space-y-3">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>{getModuleLabel(module)}</span>
                  </h4>
                  <div className="grid gap-2 pl-6">
                    {modulePermissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={permission.id}
                          checked={formData.selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) => 
                            handlePermissionToggle(permission.id, checked as boolean)
                          }
                        />
                        <Label htmlFor={permission.id} className="flex items-center space-x-2 cursor-pointer">
                          <Badge className={getActionColor(permission.action)}>
                            {permission.action}
                          </Badge>
                          <span>{permission.description}</span>
                        </Label>
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
              Modifiez les permissions du profil {selectedProfile?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Nom du profil</Label>
              <Input 
                id="editName" 
                value={formData.name} 
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Gestionnaire commercial"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea 
                id="editDescription" 
                value={formData.description} 
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du profil et de ses responsabilités"
              />
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              {Object.entries(getPermissionsByModule()).map(([module, modulePermissions]) => (
                <div key={module} className="space-y-3">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>{getModuleLabel(module)}</span>
                  </h4>
                  <div className="grid gap-2 pl-6">
                    {modulePermissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${permission.id}`}
                          checked={formData.selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) => 
                            handlePermissionToggle(permission.id, checked as boolean)
                          }
                        />
                        <Label htmlFor={`edit-${permission.id}`} className="flex items-center space-x-2 cursor-pointer">
                          <Badge className={getActionColor(permission.action)}>
                            {permission.action}
                          </Badge>
                          <span>{permission.description}</span>
                        </Label>
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