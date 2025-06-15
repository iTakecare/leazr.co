import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, User, Shield, UserCheck } from "lucide-react";

type Permission = {
  permission_name: string;
  permission_description: string;
  module: string;
  action: string;
  granted: boolean;
  expires_at: string | null;
};

type PermissionGroup = {
  [module: string]: Permission[];
};

type PermissionProfile = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
};

type UserPermissionsManagerProps = {
  userId: string;
  userName: string;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
};

const UserPermissionsManager = ({ 
  userId, 
  userName, 
  userEmail, 
  isOpen, 
  onClose 
}: UserPermissionsManagerProps) => {
  const [permissions, setPermissions] = useState<PermissionGroup>({});
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserPermissions();
      fetchAllPermissions();
      fetchProfiles();
    }
  }, [isOpen, userId]);

  const fetchUserPermissions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId
      });

      if (error) throw error;

      // Grouper les permissions par module
      const grouped = data.reduce((acc: PermissionGroup, perm: Permission) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push(perm);
        return acc;
      }, {});

      setPermissions(grouped);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      toast.error("Erreur lors de la récupération des permissions");
    }
  };

  const fetchAllPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module, action');

      if (error) throw error;
      setAllPermissions(data || []);
    } catch (error) {
      console.error("Error fetching all permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('permission_profiles')
        .select('id, name, description, permissions')
        .order('name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const handlePermissionToggle = async (permissionName: string, granted: boolean) => {
    setSaving(true);
    try {
      const permission = allPermissions.find(p => p.name === permissionName);
      if (!permission) return;

      // Vérifier si la permission existe déjà
      const { data: existingPermission } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', userId)
        .eq('permission_id', permission.id)
        .single();

      if (existingPermission) {
        // Mettre à jour la permission existante
        const { error } = await supabase
          .from('user_permissions')
          .update({ 
            granted: granted,
            granted_at: new Date().toISOString(),
            granted_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('user_id', userId)
          .eq('permission_id', permission.id);

        if (error) throw error;
      } else {
        // Créer une nouvelle permission
        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            permission_id: permission.id,
            granted: granted,
            granted_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
      }

      // Mettre à jour l'état local
      setPermissions(prev => {
        const newPermissions = { ...prev };
        Object.keys(newPermissions).forEach(module => {
          newPermissions[module] = newPermissions[module].map(perm => 
            perm.permission_name === permissionName 
              ? { ...perm, granted }
              : perm
          );
        });
        return newPermissions;
      });

      toast.success("Permission mise à jour avec succès");
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Erreur lors de la mise à jour de la permission");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyProfile = async (profileId: string) => {
    if (!profileId) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('apply_permission_profile', {
        p_user_id: userId,
        p_profile_id: profileId
      });

      if (error) throw error;

      toast.success("Profil appliqué avec succès");
      setSelectedProfile("");
      fetchUserPermissions();
    } catch (error) {
      console.error("Error applying profile:", error);
      toast.error("Erreur lors de l'application du profil");
    } finally {
      setSaving(false);
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'settings': return <Settings className="h-4 w-4" />;
      case 'users': return <User className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
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
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            Chargement des permissions...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Gestion des permissions</span>
          </DialogTitle>
          <DialogDescription>
            Gérer les permissions pour <strong>{userName}</strong> ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Profile Application */}
          <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
            <UserCheck className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Label htmlFor="profile-select">Appliquer un profil prédéfini :</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Choisir un profil de permissions..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name} - {profile.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => handleApplyProfile(selectedProfile)}
              disabled={!selectedProfile || saving}
              size="sm"
            >
              Appliquer
            </Button>
          </div>

          <Separator />
          {Object.entries(permissions).map(([module, modulePermissions]) => (
            <div key={module} className="space-y-3">
              <div className="flex items-center space-x-2">
                {getModuleIcon(module)}
                <h3 className="text-lg font-medium">{getModuleLabel(module)}</h3>
              </div>
              <Separator />
              
              <div className="grid gap-3">
                {modulePermissions.map((permission) => (
                  <div 
                    key={permission.permission_name} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getActionColor(permission.action)}>
                          {permission.action}
                        </Badge>
                        <span className="font-medium">
                          {permission.permission_description}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {permission.permission_name}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={permission.permission_name}>
                        {permission.granted ? 'Accordé' : 'Refusé'}
                      </Label>
                      <Switch
                        id={permission.permission_name}
                        checked={permission.granted}
                        onCheckedChange={(checked) => 
                          handlePermissionToggle(permission.permission_name, checked)
                        }
                        disabled={saving}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(permissions).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucune permission configurée pour cet utilisateur.
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserPermissionsManager;