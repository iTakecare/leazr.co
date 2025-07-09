import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, UserPlus, Trash2, Edit, RefreshCw, Building2, Shield, UserCheck } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Badge } from "@/components/ui/badge";
import UserPermissionsManager from "./UserPermissionsManager";

type CompanyUser = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  last_sign_in_at: string;
  has_user_account: boolean;
};

type Company = {
  id: string;
  name: string;
  plan: string;
  is_active: boolean;
  account_status?: string;
  trial_ends_at?: string;
  trial_starts_at?: string;
};

type PermissionProfile = {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
};

const MultiTenantUserManager = () => {
  const { companyId, loading: companyLoading } = useMultiTenant();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [permissionProfiles, setPermissionProfiles] = useState<PermissionProfile[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showApplyProfileDialog, setShowApplyProfileDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRole, setNewRole] = useState("client");
  const [newCompanyId, setNewCompanyId] = useState("");

  useEffect(() => {
    if (!companyLoading && companyId) {
      checkPermissions();
      fetchCompanies();
      fetchPermissionProfiles();
      setSelectedCompany(companyId);
    }
  }, [companyLoading, companyId]);

  useEffect(() => {
    if (selectedCompany && canManageUsers) {
      fetchUsers();
    }
  }, [selectedCompany, canManageUsers]);

  const checkPermissions = async () => {
    try {
      const { data, error } = await supabase.rpc('can_manage_users');
      if (error) throw error;
      setCanManageUsers(data);
    } catch (error) {
      console.error("Error checking permissions:", error);
      setCanManageUsers(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      // Récupérer l'email de l'utilisateur connecté pour faire le lien avec les prospects
      const { data: { user } } = await supabase.auth.getUser();
      
      // Récupérer seulement l'entreprise de l'utilisateur connecté
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          id, 
          name, 
          plan, 
          is_active, 
          account_status, 
          trial_ends_at,
          trial_starts_at
        `)
        .eq('id', companyId)
        .order('name');
      
      if (error) throw error;

      // Récupérer les données prospects pour avoir les vraies dates d'essai
      const { data: prospectsData } = await supabase
        .from('prospects')
        .select('email, trial_ends_at, company_name')
        .in('status', ['active', 'converted']);

      // Créer un map des prospects par nom d'entreprise pour récupérer les vraies dates d'essai
      const prospectsMap = new Map();
      if (prospectsData && user?.email) {
        prospectsData.forEach(prospect => {
          if (prospect.email === user.email && prospect.company_name) {
            prospectsMap.set(prospect.company_name, prospect);
          }
        });
      }

      // Enrichir les données company avec les dates d'essai des prospects
      const enrichedCompanies = (companiesData || []).map(company => {
        const prospect = prospectsMap.get(company.name);
        return {
          ...company,
          // Utiliser la date d'essai du prospect si disponible, sinon celle de l'entreprise
          trial_ends_at: prospect?.trial_ends_at || company.trial_ends_at
        };
      });

      setCompanies(enrichedCompanies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast.error("Erreur lors de la récupération des entreprises");
    }
  };

  const fetchPermissionProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('permission_profiles')
        .select('id, name, description, is_system')
        .order('name');
      
      if (error) throw error;
      setPermissionProfiles(data || []);
    } catch (error) {
      console.error("Error fetching permission profiles:", error);
      toast.error("Erreur lors de la récupération des profils de permissions");
    }
  };
  
  const fetchUsers = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_company_users', {
        p_company_id: selectedCompany
      });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors de la récupération des utilisateurs");
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddUser = async () => {
    if (!newEmail || !newPassword) {
      toast.error("L'email et le mot de passe sont requis");
      return;
    }
    
    if (!newCompanyId) {
      toast.error("Veuillez sélectionner une entreprise");
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('create_company_user', {
        p_email: newEmail,
        p_password: newPassword,
        p_first_name: newFirstName,
        p_last_name: newLastName,
        p_role: newRole,
        p_company_id: newCompanyId
      });
      
      if (error) throw error;
      
      toast.success("Utilisateur créé avec succès");
      setShowAddDialog(false);
      resetForm();
      if (newCompanyId === selectedCompany) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Erreur lors de la création de l'utilisateur");
    }
  };
  
  const handleEditUser = async () => {
    if (!selectedUser) return;
    
    try {
      const { error } = await supabase.rpc('update_company_user', {
        p_user_id: selectedUser.user_id,
        p_first_name: newFirstName,
        p_last_name: newLastName,
        p_role: newRole,
        p_company_id: newCompanyId === "keep_current" ? undefined : newCompanyId || undefined
      });
      
      if (error) throw error;
      
      toast.success("Utilisateur mis à jour avec succès");
      setShowEditDialog(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Erreur lors de la mise à jour de l'utilisateur");
    }
  };
  
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: selectedUser.user_id }
      });
      
      if (error) throw error;
      
      toast.success("Utilisateur supprimé avec succès");
      setShowDeleteDialog(false);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erreur lors de la suppression de l'utilisateur");
    }
  };
  
  const resetForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewFirstName("");
    setNewLastName("");
    setNewRole("client");
    setNewCompanyId("");
  };
  
  const openEditDialog = (user: CompanyUser) => {
    setSelectedUser(user);
    setNewEmail(user.email);
    setNewPassword("");
    setNewFirstName(user.first_name || "");
    setNewLastName(user.last_name || "");
    setNewRole(user.role || "client");
    setNewCompanyId("");
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (user: CompanyUser) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const openPermissionsDialog = (user: CompanyUser) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };

  const openApplyProfileDialog = (user: CompanyUser) => {
    setSelectedUser(user);
    setSelectedProfileId("");
    setShowApplyProfileDialog(true);
  };

  const handleApplyProfile = async () => {
    if (!selectedUser || !selectedProfileId) {
      toast.error("Veuillez sélectionner un profil");
      return;
    }

    try {
      const { data, error } = await supabase.rpc('apply_permission_profile', {
        p_user_id: selectedUser.user_id,
        p_profile_id: selectedProfileId
      });

      if (error) throw error;

      toast.success("Profil de permissions appliqué avec succès");
      setShowApplyProfileDialog(false);
      setSelectedUser(null);
      setSelectedProfileId("");
    } catch (error) {
      console.error("Error applying permission profile:", error);
      toast.error("Erreur lors de l'application du profil");
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "Jamais";
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'default';
      case 'ambassador': return 'secondary';
      case 'partner': return 'outline';
      default: return 'secondary';
    }
  };

  const getCompanyDisplayText = (company: Company) => {
    // Si l'entreprise est en période d'essai
    if (company.account_status === 'trial' && company.trial_ends_at) {
      const trialEndDate = new Date(company.trial_ends_at);
      const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
      
      if (daysRemaining > 0) {
        return `${company.name} (Essai - ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''})`;
      } else {
        return `${company.name} (Essai expiré)`;
      }
    }
    
    // Sinon afficher le plan normal
    return `${company.name} (${company.plan})`;
  };

  if (!canManageUsers) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Vous n'avez pas les permissions nécessaires pour gérer les utilisateurs.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Gestion des utilisateurs</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <Label htmlFor="company-select">Entreprise :</Label>
            </div>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Sélectionner une entreprise" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {getCompanyDisplayText(company)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchUsers} disabled={!selectedCompany}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Ajouter un utilisateur
          </Button>
        </div>
      </div>
      
      {!selectedCompany ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Veuillez sélectionner une entreprise pour voir ses utilisateurs.
          </p>
        </div>
      ) : loading ? (
        <div className="py-8 text-center">Chargement des utilisateurs...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom complet</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Aucun utilisateur trouvé pour cette entreprise
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{user.first_name} {user.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openApplyProfileDialog(user)} title="Appliquer un profil">
                        <UserCheck className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openPermissionsDialog(user)} title="Gérer les permissions">
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(user)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      
      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>
              Créez un nouvel utilisateur et assignez-le à une entreprise.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input 
                  id="firstName" 
                  value={newFirstName} 
                  onChange={(e) => setNewFirstName(e.target.value)} 
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input 
                  id="lastName" 
                  value={newLastName} 
                  onChange={(e) => setNewLastName(e.target.value)} 
                  placeholder="Nom"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                placeholder="email@exemple.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input 
                id="password" 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Mot de passe sécurisé"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="ambassador">Ambassadeur</SelectItem>
                  <SelectItem value="partner">Partenaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Entreprise</Label>
              <Select value={newCompanyId} onValueChange={setNewCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {getCompanyDisplayText(company)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddUser}>
              Créer l'utilisateur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'utilisateur.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">Prénom</Label>
                <Input 
                  id="editFirstName" 
                  value={newFirstName} 
                  onChange={(e) => setNewFirstName(e.target.value)} 
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Nom</Label>
                <Input 
                  id="editLastName" 
                  value={newLastName} 
                  onChange={(e) => setNewLastName(e.target.value)} 
                  placeholder="Nom"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email (lecture seule)</Label>
              <Input 
                id="editEmail" 
                type="email" 
                value={newEmail} 
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editRole">Rôle</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="ambassador">Ambassadeur</SelectItem>
                  <SelectItem value="partner">Partenaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editCompany">Changer d'entreprise (optionnel)</Label>
              <Select value={newCompanyId} onValueChange={setNewCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Laisser dans l'entreprise actuelle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep_current">Garder l'entreprise actuelle</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {getCompanyDisplayText(company)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditUser}>
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="py-4">
              <p>Vous allez supprimer l'utilisateur suivant :</p>
              <p className="font-medium mt-2">
                {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.email})
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Profile Dialog */}
      <Dialog open={showApplyProfileDialog} onOpenChange={setShowApplyProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appliquer un profil de permissions</DialogTitle>
            <DialogDescription>
              Sélectionnez un profil à appliquer à l'utilisateur {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile">Profil de permissions</Label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un profil" />
                </SelectTrigger>
                <SelectContent>
                  {permissionProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex items-center space-x-2">
                        <span>{profile.name}</span>
                        {profile.is_system && (
                          <Badge variant="secondary" className="text-xs">
                            Système
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedProfileId && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  {permissionProfiles.find(p => p.id === selectedProfileId)?.description || "Aucune description"}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyProfileDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleApplyProfile}>
              Appliquer le profil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Permissions Manager */}
      {selectedUser && (
        <UserPermissionsManager
          userId={selectedUser.user_id}
          userName={`${selectedUser.first_name} ${selectedUser.last_name}`}
          userEmail={selectedUser.email}
          isOpen={showPermissionsDialog}
          onClose={() => setShowPermissionsDialog(false)}
        />
      )}
    </div>
  );
};

export default MultiTenantUserManager;