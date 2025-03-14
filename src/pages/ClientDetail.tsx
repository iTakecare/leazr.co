import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Pencil, Trash, MapPin, Mail, Phone, Building2, FileText, Users2, Info, KeyRound, UserPlus } from "lucide-react";
import { getClientById, deleteClient, resetClientPassword } from "@/services/clientService";
import { Client } from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ClientCleanupButton from "@/components/clients/ClientCleanupButton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/utils/formatters";
import Container from "@/components/layout/Container";
import CollaboratorForm from "@/components/clients/CollaboratorForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'active': return "default";
    case 'inactive': return "secondary";
    case 'pending': return "outline";
    case 'duplicate': return "destructive";
    default: return "default";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return "Client actif";
    case 'inactive': return "Client inactif";
    case 'pending': return "En attente";
    case 'duplicate': return "Doublon";
    default: return status;
  }
};

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [isCollaboratorFormOpen, setIsCollaboratorFormOpen] = useState(false);
  const navigate = useNavigate();

  const fetchClientData = async () => {
    if (!id) {
      setError("Client ID is missing.");
      setLoading(false);
      return;
    }

    try {
      const clientData = await getClientById(id);
      if (clientData) {
        setClient(clientData);
      } else {
        setError("Client not found.");
      }
    } catch (e) {
      setError("Failed to fetch client.");
      console.error("Error fetching client:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const handleDeleteClick = async () => {
    if (!id) {
      toast.error("Client ID is missing.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this client?")) {
      try {
        setLoading(true);
        await deleteClient(id);
        toast.success("Client deleted successfully.");
        navigate('/clients');
      } catch (e) {
        toast.error("Failed to delete client.");
        console.error("Error deleting client:", e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!client?.email) {
      toast.error("L'adresse email du client est manquante.");
      return;
    }

    try {
      setResetPasswordLoading(true);
      const success = await resetClientPassword(client.email);
      if (success) {
        toast.success("Email de réinitialisation envoyé avec succès.");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Erreur lors de la réinitialisation du mot de passe.");
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleCollaboratorAdded = async () => {
    if (id) {
      setLoading(true);
      try {
        await fetchClientData();
        setIsCollaboratorFormOpen(false);
      } catch (e) {
        console.error("Error refreshing client data:", e);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-lg">Chargement des informations client...</div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="destructive" className="mt-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (!client) {
    return (
      <Container>
        <Alert className="mt-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>Aucun client trouvé avec cet identifiant.</AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-6">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{client.name}</h1>
              {client.status && (
                <Badge variant={getStatusVariant(client.status)} className="text-xs px-2 py-1">
                  {getStatusLabel(client.status)}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {client.company && `${client.company} • `}
              ID: {client.id.substring(0, 8)}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/clients/edit/${id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Link>
            </Button>
            {client.email && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetPassword} 
                disabled={resetPasswordLoading}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                {resetPasswordLoading ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
              </Button>
            )}
            <ClientCleanupButton />
            <Button variant="destructive" size="sm" onClick={handleDeleteClick}>
              <Trash className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{client.phone}</span>
                    </div>
                  )}
                  {client.company && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">{client.company}</span>
                    </div>
                  )}
                  {client.vat_number && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">TVA : {client.vat_number}</span>
                    </div>
                  )}
                </div>
                {(client.address || client.city || client.postal_code || client.country) && (
                  <div className="flex items-start gap-2 pt-2">
                    <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                    <div className="text-sm">
                      {client.address && <div>{client.address}</div>}
                      {(client.postal_code || client.city) && (
                        <div>{client.postal_code} {client.city}</div>
                      )}
                      {client.country && <div>{client.country}</div>}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Date de création</span>
                  <span className="text-sm font-medium">{formatDate(client.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Dernière mise à jour</span>
                  <span className="text-sm font-medium">{formatDate(client.updated_at)}</span>
                </div>
                {client.collaborators && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Collaborateurs</span>
                    <span className="text-sm font-medium">{client.collaborators.length}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md mb-4">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="collaborators">Collaborateurs</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informations détaillées</CardTitle>
                <CardDescription>Toutes les informations sur ce client</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Nom:</strong> {client.name}</div>
                <div><strong>Email:</strong> {client.email || '-'}</div>
                <div><strong>Entreprise:</strong> {client.company || '-'}</div>
                <div><strong>Téléphone:</strong> {client.phone || '-'}</div>
                <div><strong>Adresse:</strong> {client.address || '-'}</div>
                <div><strong>Ville:</strong> {client.city || '-'}</div>
                <div><strong>Code Postal:</strong> {client.postal_code || '-'}</div>
                <div><strong>Pays:</strong> {client.country || '-'}</div>
                <div><strong>Numéro de TVA:</strong> {client.vat_number || '-'}</div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="collaborators">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Collaborateurs</CardTitle>
                  <CardDescription>Liste des personnes associées à ce client</CardDescription>
                </div>
                <Dialog open={isCollaboratorFormOpen} onOpenChange={setIsCollaboratorFormOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Ajouter un collaborateur
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un collaborateur</DialogTitle>
                      <DialogDescription>
                        Ajoutez un collaborateur pour ce client. Les données seront enregistrées dans les notes du client jusqu'à la mise à jour du schéma de base de données.
                      </DialogDescription>
                    </DialogHeader>
                    <CollaboratorForm clientId={id || ''} onSuccess={handleCollaboratorAdded} />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {client?.collaborators && client.collaborators.length > 0 ? (
                  <div className="space-y-4">
                    {client.collaborators.map(collaborator => (
                      <div key={collaborator.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-lg">{collaborator.name}</div>
                            <div className="text-sm text-muted-foreground">{collaborator.role}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            {collaborator.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-sm">{collaborator.email}</span>
                              </div>
                            )}
                            {collaborator.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-sm">{collaborator.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {collaborator.department && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            Département: {collaborator.department}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24 text-muted-foreground">
                    <Users2 className="h-5 w-5 mr-2 opacity-70" />
                    <span>Aucun collaborateur associé à ce client.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Informations additionnelles sur ce client</CardDescription>
              </CardHeader>
              <CardContent>
                {client.notes ? (
                  <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap">
                    {client.notes}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24 text-muted-foreground">
                    <FileText className="h-5 w-5 mr-2 opacity-70" />
                    <span>Aucune note disponible.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
};

export default ClientDetail;
