
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useUsers } from "@/hooks/useUsers";
import { UserExtended, updateUserPassword } from "@/services/userService";
import { Loader2, Plus, Search, Pencil, Trash2, RefreshCw, Shield, Clock, CalendarDays, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

const UserManagement: React.FC = () => {
  const { users, loading, error, refreshUsers, updateUser, addUser, removeUser } = useUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<UserExtended | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "admin", // Par défaut à admin car nous ne gérons que les admins ici
    company: ""
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  // Filtrer uniquement les administrateurs
  const adminUsers = users.filter(user => 
    user.role === 'admin'
  );

  // Filtrer les administrateurs en fonction du terme de recherche
  const filteredUsers = adminUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.company || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditUser = (user: UserExtended) => {
    setEditingUser(user);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    const success = await updateUser(editingUser.id, {
      first_name: editingUser.first_name,
      last_name: editingUser.last_name,
      role: editingUser.role,
      company: editingUser.company
    });
    
    if (success) {
      setEditingUser(null);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      toast.error("Veuillez entrer un mot de passe");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    
    const success = await updateUserPassword(newPassword);
    if (success) {
      setNewPassword("");
      setIsUpdatingPassword(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return;
    
    setUploading(true);
    try {
      // Vérifier si le bucket avatars existe, sinon le créer
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.find(bucket => bucket.name === 'avatars')) {
        await supabase.storage.createBucket('avatars', { public: true });
      }
      
      // Télécharger l'avatar
      const fileName = `${user.id}-${Date.now()}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          upsert: true,
          contentType: avatarFile.type
        });
        
      if (error) throw error;
      
      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
        
      // Mettre à jour le profil avec la nouvelle URL d'avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      toast.success("Avatar mis à jour avec succès");
      refreshUsers();
      setAvatarFile(null);
    } catch (error: any) {
      console.error("Erreur lors du téléchargement de l'avatar:", error);
      toast.error(`Erreur: ${error.message || "Impossible de télécharger l'avatar"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error("L'email et le mot de passe sont requis");
      return;
    }
    
    // Force le rôle à admin
    const userData = { ...newUser, role: "admin" };
    const success = await addUser(userData);
    
    if (success) {
      setIsAdding(false);
      setNewUser({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        role: "admin",
        company: ""
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet administrateur ?")) {
      await removeUser(userId);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Jamais";
    try {
      return format(new Date(dateString), "dd MMM yyyy à HH:mm", { locale: fr });
    } catch (e) {
      return "Date invalide";
    }
  };

  // Trouver l'utilisateur actuel dans la liste
  const currentUserDetails = user ? adminUsers.find(u => u.id === user.id) : null;

  useEffect(() => {
    // Au chargement, si l'utilisateur actuel est un admin, s'assurer qu'il est dans la liste
    if (user && user.user_metadata?.role === 'admin' && !loading && users.length > 0) {
      const userFound = users.some(u => u.id === user.id);
      if (!userFound) {
        // Forcer un rechargement si l'utilisateur actuel n'est pas dans la liste
        refreshUsers();
      }
    }
  }, [user, users, loading]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
          <p className="text-muted-foreground">Gérez les utilisateurs, leurs rôles et leurs permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshUsers}
            disabled={loading}
            className="h-9"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Actualiser</span>
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-1">Gestion des administrateurs</h3>
          <p className="text-sm text-muted-foreground mb-4">Consultez et gérez les administrateurs du système</p>
          
          <div className="flex items-center justify-between mb-6">
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
              <DialogTrigger asChild>
                <Button className="ml-auto" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvel administrateur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un nouvel administrateur</DialogTitle>
                  <DialogDescription>
                    Créez un compte administrateur avec les informations de base.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-email" className="text-right">Email</Label>
                    <Input
                      id="new-email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-password" className="text-right">Mot de passe</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-first-name" className="text-right">Prénom</Label>
                    <Input
                      id="new-first-name"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-last-name" className="text-right">Nom</Label>
                    <Input
                      id="new-last-name"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-company" className="text-right">Entreprise</Label>
                    <Input
                      id="new-company"
                      value={newUser.company}
                      onChange={(e) => setNewUser({ ...newUser, company: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Annuler</Button>
                  </DialogClose>
                  <Button onClick={handleCreateUser}>Créer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Section de profil utilisateur connecté */}
        {user && (
          <div className="border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-2">Mon profil administrateur</h3>
            <p className="text-sm text-muted-foreground mb-4">Gérez votre profil administrateur</p>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={currentUserDetails?.avatar_url || ''} />
                  <AvatarFallback className="text-lg">
                    {user.first_name?.[0] || ''}{user.last_name?.[0] || ''}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center">
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  <label htmlFor="avatar-upload" className="flex items-center space-x-2 cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                    <Upload size={16} />
                    <span>Changer d'avatar</span>
                  </label>
                  {avatarFile && (
                    <Button 
                      onClick={uploadAvatar} 
                      disabled={uploading} 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                    >
                      {uploading ? 'Téléchargement...' : 'Télécharger'}
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/30 mb-4">
                  <div className="flex flex-col space-y-1">
                    <h4 className="text-sm font-semibold text-primary">Identifiant utilisateur (UID)</h4>
                    <p className="text-sm font-mono break-all">{user?.id || "Non disponible"}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-auto self-start"
                      onClick={() => {
                        if (user?.id) {
                          navigator.clipboard.writeText(user.id);
                          toast.success("UID copié dans le presse-papier");
                        }
                      }}
                      disabled={!user?.id}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copier l'UID
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="current-first-name">Prénom</Label>
                    <Input
                      id="current-first-name"
                      value={currentUserDetails?.first_name || ''}
                      onChange={(e) => currentUserDetails && setEditingUser({
                        ...currentUserDetails,
                        first_name: e.target.value
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="current-last-name">Nom</Label>
                    <Input
                      id="current-last-name"
                      value={currentUserDetails?.last_name || ''}
                      onChange={(e) => currentUserDetails && setEditingUser({
                        ...currentUserDetails,
                        last_name: e.target.value
                      })}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="current-company">Entreprise</Label>
                  <Input
                    id="current-company"
                    value={currentUserDetails?.company || ''}
                    onChange={(e) => currentUserDetails && setEditingUser({
                      ...currentUserDetails,
                      company: e.target.value
                    })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="current-email">Email</Label>
                  <Input
                    id="current-email"
                    value={currentUserDetails?.email || ''}
                    disabled
                    className="mt-1 bg-gray-100"
                  />
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 pt-2">
                  <Button 
                    onClick={() => currentUserDetails && handleUpdateUser()} 
                    disabled={!editingUser || editingUser.id !== user.id}
                  >
                    Mettre à jour le profil
                  </Button>
                  
                  <Dialog open={isUpdatingPassword} onOpenChange={setIsUpdatingPassword}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Changer le mot de passe</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Changer votre mot de passe</DialogTitle>
                        <DialogDescription>
                          Entrez votre nouveau mot de passe ci-dessous.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="new-password-field" className="text-right">Nouveau mot de passe</Label>
                          <Input
                            id="new-password-field"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="col-span-3"
                          />
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Annuler</Button>
                        </DialogClose>
                        <Button onClick={handleUpdatePassword}>Mettre à jour</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Liste des administrateurs</h3>
          <p className="text-sm text-muted-foreground mb-4">Tous les administrateurs du système</p>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un administrateur..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Chargement des administrateurs...
                </p>
              </div>
            ) : error ? (
              <div className="rounded-md bg-destructive/15 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-destructive">
                      Erreur lors du chargement des administrateurs
                    </h3>
                    <div className="mt-2 text-sm text-destructive/80">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 bg-card rounded-md border p-6">
                <p className="text-muted-foreground">Aucun administrateur trouvé</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Administrateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Dernière connexion</TableHead>
                      <TableHead>Compte associé</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              {user.avatar_url ? (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback>
                                    {user.first_name?.[0] || ''}{user.last_name?.[0] || ''}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <Shield className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <CalendarDays className="h-3 w-3 inline mr-1" />
                                {formatDate(user.created_at).split(' à ')[0]}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.company || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span className="text-xs">{formatDate(user.last_sign_in_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {user.user_metadata?.ambassador_id && (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                Ambassadeur
                              </Badge>
                            )}
                            {user.user_metadata?.partner_id && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                Partenaire
                              </Badge>
                            )}
                            {!user.user_metadata?.ambassador_id && !user.user_metadata?.partner_id && (
                              <span className="text-xs text-muted-foreground">Aucun compte associé</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Dialog open={editingUser?.id === user.id && editingUser.id !== (currentUserDetails?.id || '')} onOpenChange={(open) => !open && setEditingUser(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                {editingUser && (
                                  <>
                                    <DialogHeader>
                                      <DialogTitle>Modifier l'administrateur</DialogTitle>
                                      <DialogDescription>
                                        Modifiez les informations de l'administrateur {editingUser.email}
                                      </DialogDescription>
                                    </DialogHeader>
                                    
                                    <div className="grid gap-4 py-4">
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-first-name" className="text-right">Prénom</Label>
                                        <Input
                                          id="edit-first-name"
                                          value={editingUser.first_name || ''}
                                          onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                                          className="col-span-3"
                                        />
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-last-name" className="text-right">Nom</Label>
                                        <Input
                                          id="edit-last-name"
                                          value={editingUser.last_name || ''}
                                          onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                                          className="col-span-3"
                                        />
                                      </div>
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-company" className="text-right">Entreprise</Label>
                                        <Input
                                          id="edit-company"
                                          value={editingUser.company || ''}
                                          onChange={(e) => setEditingUser({ ...editingUser, company: e.target.value })}
                                          className="col-span-3"
                                        />
                                      </div>
                                    </div>
                                    
                                    <DialogFooter>
                                      <DialogClose asChild>
                                        <Button variant="outline">Annuler</Button>
                                      </DialogClose>
                                      <Button onClick={handleUpdateUser}>Enregistrer</Button>
                                    </DialogFooter>
                                  </>
                                )}
                              </DialogContent>
                            </Dialog>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.id === (currentUserDetails?.id || '')}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
