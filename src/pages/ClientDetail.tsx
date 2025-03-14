
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { getClientById, removeCollaborator, createAccountForClient, resetClientPassword } from "@/services/clientService";
import { Client, Collaborator } from "@/types/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  Edit,
  Trash,
  Plus,
  FileText,
  Tag,
  Clock,
  Users,
  UserPlus,
  LoaderCircle,
  KeyRound,
  Ticket,
  LucideFiles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useClientContracts } from "@/hooks/useClientContracts";
import CollaboratorForm from "@/components/clients/CollaboratorForm";
import ClientEditDialog from "@/components/clients/ClientEditDialog";

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [resetingPassword, setResetingPassword] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);

  // Utiliser le hook useClientContracts pour récupérer les contrats de ce client spécifique
  const { contracts, loading: contractsLoading, error: contractsError, refresh: refreshContracts, fetchContracts } = useClientContracts();

  useEffect(() => {
    if (id) {
      fetchClient(id);
      // Charger les contrats spécifiques à ce client
      fetchContracts(id);
    }
  }, [id]);

  const fetchClient = async (clientId: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getClientById(clientId);
      if (data) {
        setClient(data);
      } else {
        setError("Client introuvable");
      }
    } catch (err) {
      console.error("Error fetching client:", err);
      setError("Erreur lors du chargement du client");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollaborator = async (collaboratorId: string) => {
    if (!client || !id) return;
    
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce collaborateur ?")) {
      const success = await removeCollaborator(id, collaboratorId);
      if (success) {
        toast.success("Collaborateur supprimé avec succès");
        setClient({
          ...client,
          collaborators: client.collaborators?.filter(c => c.id !== collaboratorId) || []
        });
      } else {
        toast.error("Erreur lors de la suppression du collaborateur");
      }
    }
  };

  const handleClientUpdated = (updatedClient: Client) => {
    setClient(updatedClient);
    setIsEditDialogOpen(false);
    toast.success("Client mis à jour avec succès");
  };

  const handleCreateAccount = async () => {
    if (!client || !client.email) {
      toast.error("Le client doit avoir un email pour créer un compte");
      return;
    }

    setCreatingAccount(true);
    try {
      const success = await createAccountForClient(client);
      if (success) {
        toast.success("Invitation envoyée à l'email du client");
      } else {
        toast.error("Erreur lors de la création du compte");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Erreur lors de la création du compte");
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleResetPassword = async () => {
    if (!client || !client.email) {
      toast.error("Le client doit avoir un email pour réinitialiser son mot de passe");
      return;
    }

    if (!client.user_id) {
      toast.error("Le client doit avoir un compte utilisateur associé");
      return;
    }

    setResetingPassword(true);
    try {
      const success = await resetClientPassword(client.email);
      if (success) {
        toast.success("Email de réinitialisation envoyé au client");
      } else {
        toast.error("Erreur lors de l'envoi de l'email de réinitialisation");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Erreur lors de la réinitialisation du mot de passe");
    } finally {
      setResetingPassword(false);
    }
  };

  const formatDate = (date: Date) => {
    try {
      return format(date, "dd/MM/yyyy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="py-6">
            <div className="animate-pulse">
              <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-100 rounded-lg"></div>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error || !client) {
    return (
      <PageTransition>
        <Container>
          <div className="py-6">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-red-600">{error || "Client introuvable"}</p>
              <Button
                variant="outline"
                onClick={() => navigate("/clients")}
                className="mt-2"
              >
                Retour à la liste des clients
              </Button>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/clients")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold">Détails du client</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={client.status === 'active' ? 'default' : client.status === 'inactive' ? 'secondary' : 'outline'}>
                {client.status === 'active' ? 'Client actif' : client.status === 'inactive' ? 'Client inactif' : 'Prospect'}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <CardTitle>{client.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    {client.email && !client.user_id && (
                      <Button 
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={handleCreateAccount}
                        disabled={creatingAccount}
                      >
                        {creatingAccount ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        {creatingAccount ? "Envoi en cours..." : "Créer un compte"}
                      </Button>
                    )}
                    {client.email && client.user_id && (
                      <Button 
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={handleResetPassword}
                        disabled={resetingPassword}
                      >
                        {resetingPassword ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="h-4 w-4" />
                        )}
                        {resetingPassword ? "Envoi en cours..." : "Renvoyer mot de passe"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {client.company && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{client.company}</span>
                        </div>
                      )}
                      {client.vat_number && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span>{client.vat_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {client.address && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p>{client.address}</p>
                          {client.city && client.postal_code && (
                            <p>
                              {client.postal_code} {client.city}
                              {client.country && `, ${client.country}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Client créé le {formatDate(client.created_at)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Nouvelle section pour les contrats du client */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LucideFiles className="h-5 w-5 text-primary" />
                    <CardTitle>Contrats</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setShowContractDialog(true)}
                    >
                      <Ticket className="h-4 w-4" />
                      Voir les détails
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => refreshContracts(id)}
                    >
                      <LoaderCircle className="h-4 w-4" />
                      Rafraîchir
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {contractsLoading ? (
                    <div className="text-center py-4">
                      <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2 text-sm text-muted-foreground">Chargement des contrats...</p>
                    </div>
                  ) : contractsError ? (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-red-600">{contractsError}</p>
                    </div>
                  ) : contracts.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>Aucun contrat trouvé pour ce client.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contracts.map((contract) => (
                        <div key={contract.id} className="border rounded-lg p-3">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">{contract.equipment_description || "Contrat #" + contract.id.substring(0, 8)}</h4>
                              <p className="text-sm text-muted-foreground">
                                Paiement mensuel: {contract.monthly_payment} €
                              </p>
                            </div>
                            <Badge>{contract.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle>Collaborateurs</CardTitle>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1">
                        <Plus className="h-4 w-4" />
                        Ajouter un collaborateur
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ajouter un collaborateur</DialogTitle>
                        <DialogDescription>
                          Ajoutez les informations du collaborateur pour ce client.
                        </DialogDescription>
                      </DialogHeader>
                      <CollaboratorForm 
                        clientId={id!} 
                        onSuccess={(newCollaborator) => {
                          if (client && newCollaborator) {
                            setClient({
                              ...client,
                              collaborators: [...(client.collaborators || []), newCollaborator]
                            });
                          }
                        }} 
                      />
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {(!client.collaborators || client.collaborators.length === 0) ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>Aucun collaborateur n'a été ajouté.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {client.collaborators.map(collaborator => (
                        <div key={collaborator.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{collaborator.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {collaborator.role} {collaborator.department && `- ${collaborator.department}`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCollaborator(collaborator.id)}
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="mt-2 space-y-1">
                            {collaborator.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{collaborator.email}</span>
                              </div>
                            )}
                            {collaborator.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{collaborator.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle>Notes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {client.notes ? (
                    <p className="whitespace-pre-line">{client.notes}</p>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>Aucune note n'a été ajoutée.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <ClientEditDialog 
          client={client} 
          isOpen={isEditDialogOpen} 
          onClose={() => setIsEditDialogOpen(false)}
          onClientUpdated={handleClientUpdated}
        />

        {/* Dialog pour afficher les détails des contrats du client */}
        <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Contrats de {client.name}</DialogTitle>
              <DialogDescription>
                Liste complète des contrats associés à ce client (ID: {id})
              </DialogDescription>
            </DialogHeader>
            
            {contractsLoading ? (
              <div className="py-8 text-center">
                <LoaderCircle className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Chargement des contrats...</p>
              </div>
            ) : contracts.length === 0 ? (
              <div className="py-8 text-center border rounded-lg">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p>Aucun contrat trouvé pour ce client</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => refreshContracts(id)}
                >
                  Rafraîchir les données
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {contracts.map((contract) => (
                  <Card key={contract.id}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">ID du contrat</p>
                          <p className="font-mono text-xs">{contract.id}</p>
                          
                          <p className="text-sm font-medium text-muted-foreground mt-4">Description</p>
                          <p>{contract.equipment_description || "Non spécifié"}</p>
                          
                          <p className="text-sm font-medium text-muted-foreground mt-4">Paiement mensuel</p>
                          <p className="font-bold">{contract.monthly_payment} €</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Client</p>
                          <div className="flex items-center gap-2">
                            <p>{contract.client_name}</p>
                            <Badge variant="outline" className="font-mono text-xs">
                              {contract.client_id === id ? "ID correspondant" : "ID différent !"}
                            </Badge>
                          </div>
                          
                          <p className="text-sm font-medium text-muted-foreground mt-4">Statut</p>
                          <Badge className="mt-1">{contract.status}</Badge>
                          
                          <p className="text-sm font-medium text-muted-foreground mt-4">Créé le</p>
                          <p>{new Date(contract.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowContractDialog(false)}>
                Fermer
              </Button>
              <Button onClick={() => refreshContracts(id)}>
                Rafraîchir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Container>
    </PageTransition>
  );
};

export default ClientDetail;
