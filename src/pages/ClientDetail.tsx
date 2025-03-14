
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as clientService from "@/services/clientService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertTriangle, UserCircle2, Building2, Phone, MapPin, FileText, RefreshCw, Search, Plus, Mail } from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ClientEditDialog from "@/components/clients/ClientEditDialog";
import CollaboratorForm from "@/components/clients/CollaboratorForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContractStatusBadge from "@/components/contracts/ContractStatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { verifyClientUserAssociation, mergeClients } from "@/utils/clientDiagnostics";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatters";

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCollaboratorOpen, setIsCollaboratorOpen] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [isMerging, setIsMerging] = useState(false);
  const [targetClientId, setTargetClientId] = useState('');
  const [showMergeInput, setShowMergeInput] = useState(false);
  const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);

  const {
    data: client,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["client", id],
    queryFn: () => clientService.getClientById(id as string),
    enabled: !!id,
    retry: 1,
  });

  useEffect(() => {
    const fetchContractsAndOffers = async () => {
      if (!id) return;

      setLoadingContracts(true);
      setLoadingOffers(true);

      try {
        const { data: contractsData, error: contractsError } = await supabase
          .from('contracts')
          .select('*')
          .eq('client_id', id);

        if (contractsError) {
          console.error("Error fetching contracts:", contractsError);
          toast.error("Erreur lors de la récupération des contrats");
        } else {
          setContracts(contractsData || []);
        }

        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('*')
          .eq('client_id', id)
          .eq('converted_to_contract', false);

        if (offersError) {
          console.error("Error fetching offers:", offersError);
          toast.error("Erreur lors de la récupération des demandes");
        } else {
          setOffers(offersData || []);
        }
      } finally {
        setLoadingContracts(false);
        setLoadingOffers(false);
      }
    };

    fetchContractsAndOffers();
  }, [id]);

  useEffect(() => {
    const runDiagnostics = async () => {
      if (user?.id && user?.email) {
        const results = await verifyClientUserAssociation(user.id, user.email);
        setDiagnosticResults(results);
      }
    };

    runDiagnostics();
  }, [user]);

  const handleRetry = () => {
    refetch();
  };

  const handleEditClick = () => {
    setIsEditDialogOpen(true);
  };

  const handleDiagnosticRetry = async () => {
    if (user?.id && user?.email) {
      const results = await verifyClientUserAssociation(user.id, user.email);
      setDiagnosticResults(results);
    }
  };

  const handleResetPassword = async () => {
    if (!client?.email) {
      toast.error("Email du client non défini");
      return;
    }

    setIsResetPasswordLoading(true);
    try {
      const success = await clientService.resetClientPassword(client.email);
      if (success) {
        toast.success(`Email de réinitialisation envoyé à ${client.email}`);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Erreur lors de l'envoi du mail de réinitialisation");
    } finally {
      setIsResetPasswordLoading(false);
    }
  };

  const handleClientMerge = async () => {
    if (!targetClientId || !id) {
      toast.error("Veuillez entrer un ID client cible.");
      return;
    }

    setIsMerging(true);
    try {
      const success = await mergeClients(id, targetClientId);

      if (success) {
        toast.success("Clients fusionnés avec succès !");
        navigate(`/clients/${targetClientId}`);
      }
    } catch (error) {
      console.error("Error during client merge:", error);
      toast.error("Échec de la fusion des clients");
    } finally {
      setIsMerging(false);
      setShowMergeInput(false);
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (isError) {
    return (
      <PageTransition>
        <Container>
          <div className="flex h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-base font-medium">
                Erreur lors du chargement du client.
              </p>
              <Button onClick={handleRetry} size="sm">
                Réessayer
              </Button>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (!client) {
    return (
      <PageTransition>
        <Container>
          <div className="flex h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="rounded-full bg-gray-100 p-2">
                <UserCircle2 className="h-5 w-5 text-gray-600" />
              </div>
              <p className="text-base font-medium">Client non trouvé.</p>
              <Button onClick={() => navigate("/clients")} size="sm">
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
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <p className="text-muted-foreground">
              ID: {client.id}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEditClick}>Modifier</Button>
            {client.email && (
              <Button 
                variant="outline" 
                onClick={handleResetPassword}
                disabled={isResetPasswordLoading}
                className="flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                {isResetPasswordLoading ? "Envoi en cours..." : "Réinitialiser mot de passe"}
              </Button>
            )}
            <Button variant="destructive" onClick={() => setShowMergeInput(true)} disabled={isMerging}>
              {isMerging ? "Fusion en cours..." : "Fusionner"}
            </Button>
          </div>
        </div>

        {showMergeInput && (
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="ID du client cible"
                value={targetClientId}
                onChange={(e) => setTargetClientId(e.target.value)}
                className="border rounded px-2 py-1 w-64"
              />
              <Button onClick={handleClientMerge} disabled={isMerging}>
                {isMerging ? "Fusion en cours..." : "Confirmer la fusion"}
              </Button>
              <Button variant="ghost" onClick={() => setShowMergeInput(false)}>Annuler</Button>
            </div>
          </div>
        )}

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Informations du client</CardTitle>
            <CardDescription>Détails sur le client sélectionné.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Nom:</p>
                <p>{client.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Email:</p>
                <p>{client.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Téléphone:</p>
                <p>{client.phone || "Non spécifié"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Adresse:</p>
                <p>{client.address || "Non spécifiée"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Entreprise:</p>
                <p>{client.company || "Non spécifiée"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Statut:</p>
                <Badge variant="outline">{client.status || "Actif"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="contracts" className="w-full">
          <TabsList>
            <TabsTrigger value="contracts">Contrats ({contracts.length})</TabsTrigger>
            <TabsTrigger value="offers">Demandes ({offers.length})</TabsTrigger>
            <TabsTrigger value="collaborators">Collaborateurs</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          </TabsList>
          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <CardTitle>Contrats</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingContracts ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Chargement des contrats...
                  </div>
                ) : contracts.length === 0 ? (
                  <div>Aucun contrat trouvé pour ce client.</div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {contracts.map((contract) => (
                      <Card key={contract.id}>
                        <CardHeader>
                          <CardTitle>Contrat #{contract.id.substring(0, 8)}</CardTitle>
                          <CardDescription>
                            Créé le {new Date(contract.created_at).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p>Paiement mensuel: {formatCurrency(contract.monthly_payment)}</p>
                          <ContractStatusBadge status={contract.status} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="offers">
            <Card>
              <CardHeader>
                <CardTitle>Demandes</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingOffers ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Chargement des demandes...
                  </div>
                ) : offers.length === 0 ? (
                  <div>Aucune demande trouvée pour ce client.</div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {offers.map((offer) => (
                      <Card key={offer.id}>
                        <CardHeader>
                          <CardTitle>Demande #{offer.id.substring(0, 8)}</CardTitle>
                          <CardDescription>
                            Créée le {new Date(offer.created_at).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p>Paiement mensuel: {formatCurrency(offer.monthly_payment)}</p>
                          <Badge className="bg-yellow-500">En attente de validation</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="collaborators">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Collaborateurs</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un collaborateur
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Ajouter un collaborateur</DialogTitle>
                      </DialogHeader>
                      <CollaboratorForm clientId={id} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <p>Liste des collaborateurs associés à ce client.</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="diagnostics">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Diagnostics</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {diagnosticResults ? (
                  <>
                    <p>Résultats des diagnostics :</p>
                    <pre>{JSON.stringify(diagnosticResults, null, 2)}</pre>
                    <Button onClick={handleDiagnosticRetry}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Réexécuter les diagnostics
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Exécution des diagnostics...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ClientEditDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          client={client}
          onClientUpdated={() => refetch()}
        />
      </Container>
    </PageTransition>
  );
};

export default ClientDetail;
