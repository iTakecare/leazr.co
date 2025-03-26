
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useUsers } from "@/hooks/useUsers";
import { UserExtended } from "@/services/userService";
import { Loader2, Plus, Search, Pencil, Trash2, RefreshCw, UserCircle, Clock, CalendarDays, Shield } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestion des administrateurs</CardTitle>
            <CardDescription>
              Consultez et gérez les administrateurs du système
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshUsers}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Actualiser</span>
            </Button>
            
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
              <DialogTrigger asChild>
                <Button size="sm">
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
      </CardHeader>
      <CardContent>
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
            <div className="text-center py-8">
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
                            <Shield className="h-4 w-4 text-primary" />
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
                          <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => !open && setEditingUser(null)}>
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
      </CardContent>
    </Card>
  );
};

export default UserManagement;
