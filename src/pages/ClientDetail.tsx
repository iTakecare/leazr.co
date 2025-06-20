
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CollaboratorForm from "@/components/clients/CollaboratorForm";
import CollaboratorsList from "@/components/clients/CollaboratorsList";
import { toast } from "sonner";
import { getClientById, syncClientUserAccountStatus } from "@/services/clientService";
import { resetPassword, createUserAccount } from "@/services/accountService";
import { Client } from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Building2, Mail, Phone, MapPin, FileText, Clock, UserPlus, KeyRound, ChevronLeft, User, CheckCircle, 
  AlertCircle, Info, Loader2
} from "lucide-react";
import ClientCleanupButton from "@/components/clients/ClientCleanupButton";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const fetchClient = async () => {
    if (!id) {
      console.error("ClientDetail - No ID provided");
      setError("ID de client manquant");
      toast.error("ID de client manquant");
      navigate("/clients");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("ClientDetail - Fetching client with ID:", id);
      const clientData = await getClientById(id);
      console.log("ClientDetail - Client data received:", clientData);
      
      if (!clientData) {
        console.error("ClientDetail - Client not found for ID:", id);
        setError("Client introuvable. Vérifiez vos permissions d'accès.");
        toast.error("Client introuvable. Vérifiez vos permissions d'accès.");
        return;
      }
      
      console.log("ClientDetail - Client loaded successfully:", clientData);
      setClient(clientData);
    } catch (error) {
      console.error("ClientDetail - Error fetching client:", error);
      setError("Erreur lors du chargement du client. Vérifiez vos permissions d'accès.");
      toast.error("Erreur lors du chargement du client");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [id, navigate]);

  const handleResetPassword = async () => {
    if (!client?.email) {
      toast.error("Ce client n'a pas d'adresse email");
      return;
    }

    setIsResettingPassword(true);
    try {
      const success = await resetPassword(client.email);
      if (success) {
        toast.success("Email de réinitialisation envoyé avec succès");
      } else {
        toast.error("Échec de l'envoi de l'email de réinitialisation");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Erreur lors de la réinitialisation du mot de passe");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!client) return;
    
    if (!client.email) {
      toast.error("Ce client n'a pas d'adresse email");
      return;
    }
    
    setIsCreatingAccount(true);
    try {
      const success = await createUserAccount(client, "client");
      if (success) {
        await fetchClient();
        toast.success("Compte utilisateur créé et emails de configuration envoyés");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Erreur lors de la création du compte");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleCollaboratorAdded = () => {
    fetchClient();
    toast.success("Collaborateur ajouté avec succès");
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "dd MMMM yyyy", { locale: fr });
    } catch (error) {
      return "Date invalide";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-3 text-lg">Chargement...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-xl font-semibold text-center max-w-md">
          {error || "Client introuvable"}
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Il se peut que vous n'ayez pas les permissions nécessaires pour accéder à ce client ou qu'il n'existe pas.
        </p>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate("/clients")}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour à la liste
          </Button>
          {id && (
            <Button onClick={() => fetchClient()}>
              Réessayer
            </Button>
          )}
        </div>
      </div>
    );
  }

  console.log("Client account status debug:", { 
    client_id: client.id,
    has_user_account: client.has_user_account,
    user_id: client.user_id,
    user_account_created_at: client.user_account_created_at
  });

  const hasUserAccount = Boolean(client.has_user_account);
  const hasUserId = Boolean(client.user_id);

  // Vérifier si c'est le client problématique
  const isProblematicClient = client.id === '8270aeca-563c-4f53-9ade-6342aa7b3bd9';

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          {client.company && (
            <p className="text-muted-foreground text-lg">{client.company}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/clients")} className="flex items-center">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
          <Link to={`/clients/edit/${id}`}>
            <Button className="shadow-sm">Modifier</Button>
          </Link>
        </div>
      </div>

      {isProblematicClient && (
        <ClientCleanupButton refreshClients={() => fetchClient()} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-md border-none bg-gradient-to-br from-card to-background">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Informations générales
            </CardTitle>
            <CardDescription>Coordonnées et détails du client</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {client.email && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Email</h3>
                    <p className="text-sm">{client.email}</p>
                  </div>
                </div>
              )}
              
              {client.phone && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Téléphone</h3>
                    <p className="text-sm">{client.phone}</p>
                  </div>
                </div>
              )}
              
              {client.vat_number && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Numéro de TVA</h3>
                    <p className="text-sm">{client.vat_number}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3">Adresse de facturation</h3>
              {client.address && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm">
                      {client.address}
                      {(client.postal_code || client.city) && (
                        <>, {client.postal_code} {client.city}</>
                      )}
                      {client.country && <>, {client.country}</>}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {client.has_different_shipping_address && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3">Adresse de livraison</h3>
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm">
                      {client.shipping_address}
                      {(client.shipping_postal_code || client.shipping_city) && (
                        <>, {client.shipping_postal_code} {client.shipping_city}</>
                      )}
                      {client.shipping_country && <>, {client.shipping_country}</>}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Créé le</h3>
                  <p className="text-sm">{formatDate(client.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Dernière mise à jour</h3>
                  <p className="text-sm">{formatDate(client.updated_at)}</p>
                </div>
              </div>
            </div>
            
            {client.notes && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-4 rounded-md">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Compte utilisateur
              </CardTitle>
            </div>
            <CardDescription>Accès au portail client</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {hasUserAccount ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-green-50 p-4 rounded-md border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">Compte actif</div>
                    {client.user_account_created_at && (
                      <span className="text-xs text-green-700">
                        Créé le {formatDate(client.user_account_created_at)}
                      </span>
                    )}
                    {client.user_id && (
                      <span className="block text-xs text-green-700">
                        ID: {client.user_id}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full flex items-center justify-center"
                  onClick={handleResetPassword}
                  disabled={isResettingPassword || !client.email}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {isResettingPassword ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm">Ce client n'a pas encore de compte utilisateur pour accéder au portail.</p>
                    {hasUserId && (
                      <p className="text-xs mt-2 font-medium">
                        Un ID utilisateur est associé mais le compte est marqué comme inactif.
                      </p>
                    )}
                  </div>
                </div>
                {client.email ? (
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
                    onClick={handleCreateAccount}
                    disabled={isCreatingAccount}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isCreatingAccount ? "Création en cours..." : "Créer un compte client"}
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md">
                    Une adresse email est nécessaire pour créer un compte utilisateur.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-md border-none bg-gradient-to-br from-card to-background">
          <CardHeader className="bg-muted/50 border-b">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Collaborateurs
            </CardTitle>
            <CardDescription>Personnes à contacter chez ce client</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <CollaboratorForm clientId={id!} onSuccess={handleCollaboratorAdded} />
            <CollaboratorsList 
              clientId={id!} 
              initialCollaborators={client.collaborators}
              onRefreshNeeded={fetchClient}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
