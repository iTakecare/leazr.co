import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getClientById, updateClient, deleteClient, createAccountForClient, resetClientPassword } from "@/services/clientService";
import { Client } from "@/types/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Container } from "@/components/layout/Container";
import { PageTransition } from "@/components/layout/PageTransition";
import { ClientEditDialog } from "@/components/clients/ClientEditDialog";
import { CollaboratorForm } from "@/components/clients/CollaboratorForm";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PencilIcon, Trash2Icon, UserPlus, Key, Mail, Phone, Building, MapPin, CreditCard, Stethoscope, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { verifyClientUserAssociation } from "@/utils/clientDiagnostics";
import { useClientContracts, ClientContract } from "@/hooks/useClientContracts";

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractsError, setContractsError] = useState<string | null>(null);

  const { refresh: refreshContracts } = useClientContracts();

  useEffect(() => {
    if (id) {
      fetchClient();
      fetchContracts();
    }
  }, [id]);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const clientData = await getClientById(id);
      if (clientData) {
        setClient(clientData);
      } else {
        toast.error("Client non trouvé");
        navigate("/clients");
      }
    } catch (error) {
      console.error("Error fetching client:", error);
      toast.error("Erreur lors du chargement du client");
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    setContractsLoading(true);
    setContractsError(null);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('client_id', id);

      if (error) {
        console.error("Error fetching contracts:", error);
        setContractsError("Erreur lors du chargement des contrats");
      } else {
        setContracts(data || []);
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
      setContractsError("Erreur lors du chargement des contrats");
    } finally {
      setContractsLoading(false);
    }
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    setLoading(true);
    try {
      const updatedData = await updateClient(id as string, updatedClient);
      if (updatedData) {
        setClient(updatedData);
        toast.success("Client mis à jour avec succès");
      } else {
        toast.error("Erreur lors de la mise à jour du client");
      }
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Erreur lors de la mise à jour du client");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    setIsDeleteDialogOpen(false);
    setLoading(true);
    try {
      const success = await deleteClient(id as string);
      if (success) {
        toast.success("Client supprimé avec succès");
        navigate("/clients");
      } else {
        toast.error("Erreur lors de la suppression du client");
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Erreur lors de la suppression du client");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const success = await createAccountForClient(client);
      if (success) {
        toast.success("Compte créé avec succès");
        fetchClient(); // Rafraîchir le client pour afficher l'user_id
      } else {
        toast.error("Erreur lors de la création du compte");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!client?.email) {
      toast.error("Aucun email associé à ce client");
      return;
    }
    setLoading(true);
    try {
      const success = await resetClientPassword(client.email);
      if (success) {
        toast.success("Email de réinitialisation envoyé avec succès");
      } else {
        toast.error("Erreur lors de l'envoi de l'email de réinitialisation");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Erreur lors de la réinitialisation du mot de passe");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollaborator = async (collaborator: any) => {
    if (!client) return;
    setLoading(true);
    try {
      // Ici, vous devez appeler votre service pour ajouter un collaborateur
      // et mettre à jour l'état local du client avec le nouveau collaborateur
      // Exemple:
      // const newCollaborator = await addCollaborator(client.id, collaborator);
      // if (newCollaborator) {
      //   setClient({
      //     ...client,
      //     collaborators: [...(client.collaborators || []), newCollaborator],
      //   });
      //   toast.success("Collaborateur ajouté avec succès");
      // } else {
      toast.error("Erreur lors de l'ajout du collaborateur");
      // }
    } catch (error) {
      console.error("Error adding collaborator:", error);
      toast.error("Erreur lors de l'ajout du collaborateur");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!client) return;
    setLoading(true);
    try {
      // Ici, vous devez appeler votre service pour supprimer un collaborateur
      // et mettre à jour l'état local du client en conséquence
      // Exemple:
      // const success = await removeCollaborator(client.id, collaboratorId);
      // if (success) {
      //   setClient({
      //     ...client,
      //     collaborators: client.collaborators?.filter(c => c.id !== collaboratorId),
      //   });
      //   toast.success("Collaborateur supprimé avec succès");
      // } else {
      toast.error("Erreur lors de la suppression du collaborateur");
      // }
    } catch (error) {
      console.error("Error removing collaborator:", error);
      toast.error("Erreur lors de la suppression du collaborateur");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshClient = () => {
    fetchClient();
    refreshContracts(id);
  };

  // Ajouter un état pour le diagnostic
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);

  // Fonction pour exécuter le diagnostic
  const runDiagnostic = async () => {
    try {
      setRunningDiagnostic(true);
      toast.info("Diagnostic en cours...");
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        toast.error("Utilisateur non connecté");
        return;
      }
      
      const results = await verifyClientUserAssociation(
        userData.user.id,
        userData.user.email || null
      );
      
      setDiagnosticResults(results);
      console.log("Résultats du diagnostic:", results);
      
      if (results?.correctionsMade && results.correctionsMade.length > 0) {
        // Refresh après corrections
        handleRefreshClient();
      }
      
      toast.success("Diagnostic terminé");
    } catch (error) {
      console.error("Erreur lors du diagnostic:", error);
      toast.error("Erreur lors du diagnostic");
    } finally {
      setRunningDiagnostic(false);
    }
  };

  return (
    <PageTransition>
      <Container>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Détails du client</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={runDiagnostic} disabled={runningDiagnostic}>
              {runningDiagnostic ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Diagnostic...
                </>
              ) : (
                <>
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Diagnostic
                </>
              )}
            </Button>
            <ClientEditDialog client={client} onUpdate={handleUpdateClient} disabled={loading} />
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={loading}>
              <Trash2Icon className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
        
        {/* Afficher les résultats du diagnostic si disponibles */}
        {diagnosticResults && (
          <Alert className="mb-6">
            <AlertTitle className="flex items-center">
              <Stethoscope className="mr-2 h-4 w-4" />
              Résultats du diagnostic
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2 text-sm">
                <p><strong>ID utilisateur:</strong> {diagnosticResults.userId}</p>
                <p><strong>Email utilisateur:</strong> {diagnosticResults.userEmail}</p>
                
                {diagnosticResults.clientsWithThisUserId?.length > 0 && (
                  <div>
                    <p><strong>Clients associés à cet utilisateur ({diagnosticResults.clientsWithThisUserId.length}):</strong></p>
                    <ul className="ml-4 list-disc">
                      {diagnosticResults.clientsWithThisUserId.map((client: any) => (
                        <li key={client.id}>
                          {client.name} ({client.id})
                          {client.email && ` - ${client.email}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {diagnosticResults.clientsWithSameEmail?.length > 0 && (
                  <div>
                    <p><strong>Clients avec le même email ({diagnosticResults.clientsWithSameEmail.length}):</strong></p>
                    <ul className="ml-4 list-disc">
                      {diagnosticResults.clientsWithSameEmail.map((client: any) => (
                        <li key={client.id}>
                          {client.name} ({client.id})
                          {client.user_id ? ` - Associé à l'utilisateur ${client.user_id}` : ' - Non associé'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {diagnosticResults.currentlyViewedClient && (
                  <div>
                    <p><strong>Client actuellement consulté:</strong></p>
                    <ul className="ml-4 list-disc">
                      <li>
                        {diagnosticResults.currentlyViewedClient.name} ({diagnosticResults.currentlyViewedClient.id})
                        {diagnosticResults.currentlyViewedClient.email && ` - ${diagnosticResults.currentlyViewedClient.email}`}
                        {diagnosticResults.currentlyViewedClient.user_id 
                          ? ` - Associé à l'utilisateur ${diagnosticResults.currentlyViewedClient.user_id}` 
                          : ' - Non associé à un utilisateur'}
                      </li>
                    </ul>
                  </div>
                )}
                
                {diagnosticResults.correctionsMade?.length > 0 && (
                  <div>
                    <p><strong>Corrections effectuées:</strong></p>
                    <ul className="ml-4 list-disc">
                      {diagnosticResults.correctionsMade.map((correction: string, index: number) => (
                        <li key={index}>{correction}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle><Skeleton /></CardTitle>
              <CardDescription><Skeleton /></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-medium">
                    <Skeleton />
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    <Skeleton />
                  </p>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-medium">
                    <Skeleton />
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    <Skeleton />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : client ? (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>Détails sur le client</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center space-x-4">
                  <Building className="h-4 w-4 text-gray-500" />
                  <div className="space-y-1">
                    <Label htmlFor="company">Entreprise</Label>
                    <p className="text-sm font-medium">{client.company || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <UserPlus className="h-4 w-4 text-gray-500" />
                  <div className="space-y-1">
                    <Label htmlFor="name">Nom</Label>
                    <p className="text-sm font-medium">{client.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <p className="text-sm font-medium">{client.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div className="space-y-1">
                    <Label htmlFor="phone">Téléphone</Label>
                    <p className="text-sm font-medium">{client.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div className="space-y-1">
                    <Label htmlFor="address">Adresse</Label>
                    <p className="text-sm font-medium">
                      {client.address ? `${client.address}, ${client.postal_code} ${client.city}, ${client.country}` : "N/A"}
                    </p>
                  </div>
                </div>
                {client.vat_number && (
                  <div className="flex items-center space-x-4">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <div className="space-y-1">
                      <Label htmlFor="vat_number">Numéro de TVA</Label>
                      <p className="text-sm font-medium">{client.vat_number}</p>
                    </div>
                  </div>
                )}
                {client.status && (
                  <div className="flex items-center space-x-4">
                    <div className="space-y-1">
                      <Label htmlFor="status">Statut</Label>
                      <Badge variant="secondary">{client.status}</Badge>
                    </div>
                  </div>
                )}
                {client.user_id && (
                  <div className="flex items-center space-x-4">
                    <Key className="h-4 w-4 text-gray-500" />
                    <div className="space-y-1">
                      <Label htmlFor="user_id">ID Utilisateur</Label>
                      <p className="text-sm font-medium">{client.user_id}</p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {client.email && !client.user_id && (
                  <Button onClick={handleCreateAccount} disabled={loading}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Créer un compte
                  </Button>
                )}
                {client.email && client.user_id && (
                  <Button onClick={handleResetPassword} disabled={loading}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Réinitialiser le mot de passe
                  </Button>
                )}
              </CardFooter>
            </Card>

            {client.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                  <CardDescription>Informations supplémentaires</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{client.notes}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Collaborateurs</CardTitle>
                <CardDescription>Gérer les collaborateurs associés à ce client</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] w-full rounded-md border">
                  <div className="grid gap-4">
                    {client.collaborators && client.collaborators.length > 0 ? (
                      client.collaborators.map((collaborator) => (
                        <div key={collaborator.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{collaborator.name}</p>
                            <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                            <p className="text-xs text-muted-foreground">{collaborator.role}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveCollaborator(collaborator.id)}>
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun collaborateur associé</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter>
                <CollaboratorForm clientId={client.id} onAdd={handleAddCollaborator} />
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contrats</CardTitle>
                <CardDescription>Liste des contrats associés à ce client</CardDescription>
              </CardHeader>
              <CardContent>
                {contractsLoading ? (
                  <p>Chargement des contrats...</p>
                ) : contractsError ? (
                  <p className="text-red-500">{contractsError}</p>
                ) : contracts.length > 0 ? (
                  <ScrollArea className="h-[300px] w-full rounded-md border">
                    <div className="grid gap-4">
                      {contracts.map((contract) => (
                        <div key={contract.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{contract.id}</p>
                            <p className="text-xs text-muted-foreground">{contract.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun contrat associé</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <p>Client non trouvé</p>
        )}

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Êtes-vous sûr(e) ?</DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Veuillez confirmer votre souhait de supprimer ce client.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="destructive" onClick={handleDeleteClient} disabled={loading}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Container>
    </PageTransition>
  );
};

export default ClientDetail;
