
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  UserPlus,
  UserCheck,
  UserMinus,
  Settings,
  Search,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle
} from "lucide-react";

// Types pour les utilisateurs et les rôles
type UserRole = "admin" | "manager" | "user" | "ambassador" | "partner";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status: "active" | "inactive" | "pending";
  lastLogin?: string;
  createdAt: string;
}

// Mock data pour les utilisateurs (à remplacer par une API)
const mockUsers: UserData[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    lastLogin: "2023-10-15T14:30:00",
    createdAt: "2023-01-10T09:00:00"
  },
  {
    id: "2",
    name: "Manager Example",
    email: "manager@example.com",
    role: "manager",
    status: "active",
    lastLogin: "2023-10-14T10:15:00",
    createdAt: "2023-02-15T11:30:00"
  },
  {
    id: "3",
    name: "Regular User",
    email: "user@example.com",
    role: "user",
    status: "inactive",
    lastLogin: "2023-09-28T16:45:00",
    createdAt: "2023-03-20T13:45:00"
  },
  {
    id: "4",
    name: "Ambassador Example",
    email: "ambassador@example.com",
    role: "ambassador",
    status: "active",
    lastLogin: "2023-10-12T09:30:00",
    createdAt: "2023-04-05T10:00:00"
  },
  {
    id: "5",
    name: "Partner Example",
    email: "partner@example.com",
    role: "partner",
    status: "pending",
    createdAt: "2023-10-01T08:15:00"
  }
];

// Composant pour la gestion des utilisateurs
const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "user" as UserRole,
  });
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  // Filtrer les utilisateurs en fonction des critères de recherche et des filtres
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Fonction pour ajouter un nouvel utilisateur
  const handleAddUser = () => {
    // Validation simple
    if (!newUser.name || !newUser.email || !newUser.role) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const userToAdd: UserData = {
      id: `user-${Date.now()}`, // Génère un ID temporaire (à remplacer par l'ID du backend)
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setUsers([...users, userToAdd]);
    toast.success(`L'utilisateur ${userToAdd.name} a été ajouté avec succès`);
    setIsAddUserDialogOpen(false);
    setNewUser({ name: "", email: "", role: "user" });
  };

  // Fonction pour mettre à jour un utilisateur
  const handleUpdateUser = () => {
    if (!editingUser) return;
    
    const updatedUsers = users.map(user => 
      user.id === editingUser.id ? editingUser : user
    );
    
    setUsers(updatedUsers);
    toast.success(`Les informations de ${editingUser.name} ont été mises à jour`);
    setEditingUser(null);
  };

  // Fonction pour supprimer un utilisateur
  const handleDeleteUser = (userId: string) => {
    const userToDelete = users.find(user => user.id === userId);
    if (!userToDelete) return;
    
    // Afficher une confirmation avant de supprimer
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userToDelete.name} ?`)) {
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      toast.success(`L'utilisateur ${userToDelete.name} a été supprimé`);
    }
  };

  // Changer le statut d'un utilisateur
  const handleToggleUserStatus = (userId: string) => {
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        const newStatus = user.status === "active" ? "inactive" : "active";
        toast.success(`Le statut de ${user.name} a été changé à ${newStatus}`);
        return { ...user, status: newStatus };
      }
      return user;
    });
    
    setUsers(updatedUsers);
  };

  // Fonction pour afficher le badge de statut avec la couleur appropriée
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Actif</Badge>;
      case "inactive":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Inactif</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Fonction pour afficher l'icône de rôle
  const renderRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4 text-red-500" />;
      case "manager":
        return <Settings className="h-4 w-4 text-blue-500" />;
      case "user":
        return <User className="h-4 w-4 text-gray-500" />;
      case "ambassador":
        return <UserCheck className="h-4 w-4 text-purple-500" />;
      case "partner":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Liste des utilisateurs</TabsTrigger>
          <TabsTrigger value="roles">Rôles et permissions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher un utilisateur..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select
                value={filterRole}
                onValueChange={setFilterRole}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="ambassador">Ambassadeur</SelectItem>
                  <SelectItem value="partner">Partenaire</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
              
              <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Ajouter un utilisateur
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet</Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        placeholder="john.doe@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Rôle</Label>
                      <Select 
                        value={newUser.role} 
                        onValueChange={(value: UserRole) => setNewUser({...newUser, role: value})}
                      >
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="user">Utilisateur</SelectItem>
                          <SelectItem value="ambassador">Ambassadeur</SelectItem>
                          <SelectItem value="partner">Partenaire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>Annuler</Button>
                    <Button onClick={handleAddUser}>Ajouter</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-4 py-3 text-left text-sm font-medium">Utilisateur</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Rôle</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Statut</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Dernière connexion</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Aucun utilisateur correspondant aux critères de recherche
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {user.avatar ? (
                                <AvatarImage src={user.avatar} alt={user.name} />
                              ) : (
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {renderRoleIcon(user.role)}
                            <span className="capitalize">{user.role}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {renderStatusBadge(user.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {user.lastLogin ? (
                            new Date(user.lastLogin).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          ) : (
                            <span className="text-muted-foreground/70">Jamais connecté</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={user.status === "active"}
                              onCheckedChange={() => handleToggleUserStatus(user.id)}
                            />
                            
                            <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => {
                              if (open) {
                                setEditingUser(user);
                              } else {
                                setEditingUser(null);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Modifier</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Modifier l'utilisateur</DialogTitle>
                                </DialogHeader>
                                {editingUser && (
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-name">Nom complet</Label>
                                      <Input
                                        id="edit-name"
                                        value={editingUser.name}
                                        onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-email">Email</Label>
                                      <Input
                                        id="edit-email"
                                        type="email"
                                        value={editingUser.email}
                                        onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-role">Rôle</Label>
                                      <Select 
                                        value={editingUser.role} 
                                        onValueChange={(value: UserRole) => setEditingUser({...editingUser, role: value})}
                                      >
                                        <SelectTrigger id="edit-role">
                                          <SelectValue placeholder="Sélectionner un rôle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="admin">Admin</SelectItem>
                                          <SelectItem value="manager">Manager</SelectItem>
                                          <SelectItem value="user">Utilisateur</SelectItem>
                                          <SelectItem value="ambassador">Ambassadeur</SelectItem>
                                          <SelectItem value="partner">Partenaire</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-status">Statut</Label>
                                      <Select 
                                        value={editingUser.status} 
                                        onValueChange={(value: 'active' | 'inactive' | 'pending') => 
                                          setEditingUser({...editingUser, status: value})}
                                      >
                                        <SelectTrigger id="edit-status">
                                          <SelectValue placeholder="Sélectionner un statut" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="active">Actif</SelectItem>
                                          <SelectItem value="inactive">Inactif</SelectItem>
                                          <SelectItem value="pending">En attente</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingUser(null)}>Annuler</Button>
                                  <Button onClick={handleUpdateUser}>Enregistrer</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-destructive" 
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Supprimer</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-red-500" />
                    <h3 className="font-semibold">Admin</h3>
                  </div>
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">Super-utilisateur</Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <p className="text-muted-foreground mb-2">Accès complet à toutes les fonctionnalités et données du système.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Gestion des utilisateurs</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Configuration du système</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Gestion des rôles</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Création d'ambassadeurs/partenaires</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">Manager</h3>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">Accès étendu</Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <p className="text-muted-foreground mb-2">Accès à la plupart des fonctionnalités, mais avec des restrictions sur la configuration système.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Gestion des contrats</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Gestion des offres</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Configuration système</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Gestion des utilisateurs</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-500" />
                    <h3 className="font-semibold">Utilisateur</h3>
                  </div>
                  <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200">Accès basique</Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <p className="text-muted-foreground mb-2">Accès limité aux fonctionnalités de base du système.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Consultation des contrats</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Création d'offres</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Configuration système</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Modification des contrats</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5 text-purple-500" />
                    <h3 className="font-semibold">Ambassadeur</h3>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">Accès spécial</Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <p className="text-muted-foreground mb-2">Accès aux fonctionnalités d'ambassadeur avec des commissions.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Consultation des clients</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Suivi des commissions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Création d'offres</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Configuration système</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold">Partenaire</h3>
                  </div>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Accès externe</Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <p className="text-muted-foreground mb-2">Accès aux fonctionnalités partenaires pour la collaboration.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Gestion des clients</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Création d'offres</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Suivi des commissions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Administration système</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagement;
