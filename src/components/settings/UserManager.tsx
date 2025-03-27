
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
import { User, UserPlus, Trash2, Edit, RefreshCw } from "lucide-react";

type UserData = {
  id: string;
  email: string;
  email_confirmed_at: string;
  last_sign_in_at: string;
  created_at: string;
  role?: string;
  first_name?: string;
  last_name?: string;
};

const UserManager = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRole, setNewRole] = useState("admin");
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log("Fetching users from edge function...");
      const { data, error } = await supabase.functions.invoke('get-all-users');
      
      if (error) {
        console.error("Error fetching users:", error);
        toast.error("Erreur lors de la récupération des utilisateurs : " + error.message);
        return;
      }
      
      if (!data || !Array.isArray(data)) {
        console.error("Invalid data format received:", data);
        toast.error("Format de données invalide reçu du serveur");
        setLoading(false);
        return;
      }
      
      console.log("Users data received:", data);
      
      const usersWithProfiles = await Promise.all(
        data.map(async (user: UserData) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, role')
            .eq('id', user.id)
            .single();
          
          return {
            ...user,
            first_name: profileData?.first_name || '',
            last_name: profileData?.last_name || '',
            role: profileData?.role || 'client'
          };
        })
      );
      
      const adminUsers = usersWithProfiles.filter(user => user.role === 'admin');
      setUsers(adminUsers);
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
    
    try {
      const { data: existingUser } = await supabase.rpc('check_user_exists_by_email', {
        user_email: newEmail
      });
      
      if (existingUser) {
        toast.error("Un utilisateur avec cet email existe déjà");
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email: newEmail,
          password: newPassword,
          first_name: newFirstName,
          last_name: newLastName,
          role: newRole
        }
      });
      
      if (error) {
        toast.error("Erreur lors de la création de l'utilisateur : " + error.message);
        return;
      }
      
      toast.success("Utilisateur créé avec succès");
      setShowAddDialog(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Erreur lors de la création de l'utilisateur");
    }
  };
  
  const handleEditUser = async () => {
    if (!selectedUser) return;
    
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: newFirstName,
          last_name: newLastName,
          role: newRole
        })
        .eq('id', selectedUser.id);
      
      if (profileError) {
        toast.error("Erreur lors de la mise à jour du profil : " + profileError.message);
        return;
      }
      
      if (newEmail !== selectedUser.email) {
        const { error: emailError } = await supabase.functions.invoke('update-user-email', {
          body: {
            user_id: selectedUser.id,
            new_email: newEmail
          }
        });
        
        if (emailError) {
          toast.error("Erreur lors de la mise à jour de l'email : " + emailError.message);
          return;
        }
      }
      
      if (newPassword) {
        const { error: passwordError } = await supabase.functions.invoke('update-user-password', {
          body: {
            user_id: selectedUser.id,
            new_password: newPassword
          }
        });
        
        if (passwordError) {
          toast.error("Erreur lors de la mise à jour du mot de passe : " + passwordError.message);
          return;
        }
      }
      
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
      const userId = selectedUser.id;
      
      try {
        await deleteSpecificUserAccount(userId);
        toast.success("Utilisateur supprimé avec succès");
        setShowDeleteDialog(false);
        fetchUsers();
        return;
      } catch (utilError) {
        console.error("Error using utility function:", utilError);
      }
      
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      });
      
      if (error) {
        toast.error("Erreur lors de la suppression de l'utilisateur : " + error.message);
        return;
      }
      
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
    setNewRole("admin");
  };
  
  const openEditDialog = (user: UserData) => {
    setSelectedUser(user);
    setNewEmail(user.email);
    setNewPassword("");
    setNewFirstName(user.first_name || "");
    setNewLastName(user.last_name || "");
    setNewRole(user.role || "admin");
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (user: UserData) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "Jamais";
    return new Date(dateString).toLocaleString("fr-FR");
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Gestion des administrateurs</h3>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Ajouter un administrateur
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="py-8 text-center">Chargement des utilisateurs...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom complet</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Aucun administrateur trouvé
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{user.first_name} {user.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(user)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un administrateur</DialogTitle>
            <DialogDescription>
              Créez un nouvel utilisateur avec des droits d'administration.
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
                  <SelectItem value="admin">Administrateur</SelectItem>
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
              <Label htmlFor="editEmail">Email</Label>
              <Input 
                id="editEmail" 
                type="email" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                placeholder="email@exemple.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editPassword">Nouveau mot de passe (laisser vide pour ne pas modifier)</Label>
              <Input 
                id="editPassword" 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Nouveau mot de passe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editRole">Rôle</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
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
              <p className="font-medium mt-2">{selectedUser.first_name} {selectedUser.last_name} ({selectedUser.email})</p>
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
    </div>
  );
};

const deleteSpecificUserAccount = async (userId: string): Promise<void> => {
  const { deleteSpecificUserAccount } = await import('@/utils/accountUtils');
  return deleteSpecificUserAccount(userId);
};

export default UserManager;
