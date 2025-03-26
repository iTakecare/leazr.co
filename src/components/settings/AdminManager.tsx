
import React, { useState, useEffect } from "react";
import { useUsers } from "@/hooks/useUsers";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Edit, Trash2, Activity, User } from "lucide-react";
import { AdminForm } from "./AdminForm";
import { AdminUserActivities } from "./AdminUserActivities";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { UserExtended } from "@/services/userService";

const AdminManager: React.FC = () => {
  const { users, loading, error, refreshUsers, addUser, updateUser, removeUser } = useUsers();
  const [selectedUser, setSelectedUser] = useState<UserExtended | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Filtrer seulement les administrateurs
  const adminUsers = users.filter((user) => user.role === 'admin');

  const handleCreateAdmin = async (userData: { email: string, password: string, first_name: string, last_name: string, company?: string }) => {
    const success = await addUser({
      ...userData,
      role: 'admin'
    });
    
    if (success) {
      setIsCreateDialogOpen(false);
      toast.success("Administrateur créé avec succès");
    }
  };

  const handleUpdateAdmin = async (userData: Partial<UserExtended>) => {
    if (!selectedUser) return;
    
    const success = await updateUser(selectedUser.id, userData);
    
    if (success) {
      setIsEditDialogOpen(false);
      toast.success("Administrateur mis à jour avec succès");
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedUser) return;
    
    const success = await removeUser(selectedUser.id);
    
    if (success) {
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      toast.success("Administrateur supprimé avec succès");
    }
  };

  const getInitials = (user: UserExtended) => {
    if (!user) return "??";
    
    const firstInitial = user.first_name ? user.first_name.charAt(0).toUpperCase() : "?";
    const lastInitial = user.last_name ? user.last_name.charAt(0).toUpperCase() : "?";
    
    return `${firstInitial}${lastInitial}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Jamais";
    return format(new Date(dateString), "dd MMM yyyy à HH:mm", { locale: fr });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3">Chargement des administrateurs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        <p>Erreur lors du chargement des administrateurs: {error}</p>
        <Button onClick={refreshUsers} className="mt-2">Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="all">Tous ({adminUsers.length})</TabsTrigger>
            <TabsTrigger value="recent">Récemment actifs</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button onClick={() => setIsCreateDialogOpen(true)} className="ml-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Nouvel administrateur
        </Button>
      </div>

      <TabsContent value="all" className="mt-0">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Société</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead>Compte créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun administrateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  adminUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Avatar>
                          {user.avatar_url ? (
                            <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
                          ) : (
                            <AvatarFallback>{getInitials(user)}</AvatarFallback>
                          )}
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.company || "-"}</TableCell>
                      <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsActivityDialogOpen(true);
                            }}
                          >
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="recent" className="mt-0">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {adminUsers
                .filter(user => user.last_sign_in_at)
                .sort((a, b) => {
                  const dateA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
                  const dateB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
                  return dateB - dateA;
                })
                .slice(0, 5)
                .map(user => (
                  <div key={user.id} className="flex items-center space-x-4">
                    <Avatar>
                      {user.avatar_url ? (
                        <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
                      ) : (
                        <AvatarFallback>{getInitials(user)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">Dernière connexion: {formatDate(user.last_sign_in_at)}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsActivityDialogOpen(true);
                      }}
                    >
                      <Activity className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              {adminUsers.filter(user => user.last_sign_in_at).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune activité récente
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Create Admin Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Créer un nouvel administrateur</DialogTitle>
            <DialogDescription>
              Créez un compte administrateur pour accéder à toutes les fonctionnalités de l'application.
            </DialogDescription>
          </DialogHeader>
          <AdminForm 
            onSubmit={handleCreateAdmin}
            onCancel={() => setIsCreateDialogOpen(false)}
            isCreating={true}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier un administrateur</DialogTitle>
            <DialogDescription>
              Modifiez les informations du profil administrateur.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <AdminForm 
              user={selectedUser}
              onSubmit={handleUpdateAdmin}
              onCancel={() => setIsEditDialogOpen(false)}
              isCreating={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Admin Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Supprimer un administrateur</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cet administrateur ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedUser && (
              <div className="flex items-center space-x-4">
                <Avatar>
                  {selectedUser.avatar_url ? (
                    <AvatarImage src={selectedUser.avatar_url} alt={`${selectedUser.first_name} ${selectedUser.last_name}`} />
                  ) : (
                    <AvatarFallback>{getInitials(selectedUser)}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.first_name} {selectedUser.last_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteAdmin}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Activité de l'administrateur</DialogTitle>
            <DialogDescription>
              {selectedUser && `Historique des actions de ${selectedUser.first_name} ${selectedUser.last_name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <AdminUserActivities userId={selectedUser.id} />
          )}
          <DialogFooter>
            <Button onClick={() => setIsActivityDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManager;
