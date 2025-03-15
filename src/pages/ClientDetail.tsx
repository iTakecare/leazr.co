
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CollaboratorForm from "@/components/clients/CollaboratorForm";
import { toast } from "sonner";
import { getClientById, resetClientPassword, createAccountForClient } from "@/services/clientService";
import { Client } from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Building2, Mail, Phone, MapPin, FileText, Clock, UserPlus, KeyRound, ChevronLeft, User, CheckCircle, 
  AlertCircle, Info, Loader2
} from "lucide-react";
import { adminSupabase } from "@/integrations/supabase/client";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [refreshedClient, setRefreshedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Fonction pour charger les données du client
  const fetchClient = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const clientData = await getClientById(id);
      
      if (!clientData) {
        toast.error("Client introuvable");
        navigate("/clients");
        return;
      }
      
      console.log("Client data loaded:", clientData);
      setClient(clientData);
    } catch (error) {
      console.error("Error fetching client:", error);
      toast.error("Erreur lors du chargement du client");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour récupérer les données fraîches directement depuis la base de données
  const fetchFreshClientData = async () => {
    if (!id) return;
    
    setIsRefreshing(true);
    try {
      console.log("Récupération des données fraîches du client avec ID:", id);
      
      // Utiliser adminSupabase pour garantir des données fraîches sans mise en cache
      const { data, error } = await adminSupabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error("Erreur lors de la récupération des données fraîches du client:", error);
        return;
      }
      
      console.log("Données fraîches du client depuis la base de données:", data);
      console.log("Statut du compte utilisateur:", {
        has_user_account: data.has_user_account,
        user_account_created_at: data.user_account_created_at
      });
      
      setRefreshedClient(data);
    } catch (err) {
      console.error("Exception lors de la récupération des données fraîches du client:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [id, navigate]);

  // Effet pour rafraîchir les données après création de compte ou à intervalles réguliers
  useEffect(() => {
    if (id) {
      fetchFreshClientData();
    }
  }, [id, refreshCounter, isCreatingAccount]);
  
  // Rafraîchir les données après un délai suivant la création de compte
  useEffect(() => {
    if (!isCreatingAccount && id) {
      const timer = setTimeout(() => {
        setRefreshCounter(prev => prev + 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isCreatingAccount]);

  const handleResetPassword = async () => {
    if (!client?.email) {
      toast.error("Ce client n'a pas d'adresse email");
      return;
    }

    setIsResettingPassword(true);
    try {
      const success = await resetClientPassword(client.email);
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
      const success = await createAccountForClient(client);
      if (success) {
        // Forcer le rafraîchissement des données pour afficher les changements
        setRefreshCounter(prev => prev + 1);
        toast.success("Compte utilisateur créé et emails de configuration envoyés");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Erreur lors de la création du compte");
    } finally {
      setIsCreatingAccount(false);
    }
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3 text-lg">Chargement...</span>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-3xl font-bold text-gray-400">Client introuvable</div>
        <Button variant="default" onClick={() => navigate("/clients")}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  // Utiliser les données rafraîchies si disponibles, sinon utiliser les données originales
  const currentClient = refreshedClient || client;

  // Afficher les informations de débogage complètes
  console.log("Client account status debug:", { 
    client_id: currentClient.id,
    has_user_account: currentClient.has_user_account,
    user_id: currentClient.user_id,
    user_account_created_at: currentClient.user_account_created_at
  });

  // Un compte est considéré comme actif uniquement si has_user_account est true
  const hasUserAccount = Boolean(currentClient.has_user_account);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{currentClient.name}</h1>
          {currentClient.company && (
            <p className="text-muted-foreground text-lg">{currentClient.company}</p>
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
              {currentClient.email && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Email</h3>
                    <p className="text-sm">{currentClient.email}</p>
                  </div>
                </div>
              )}
              
              {currentClient.phone && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Téléphone</h3>
                    <p className="text-sm">{currentClient.phone}</p>
                  </div>
                </div>
              )}
              
              {currentClient.vat_number && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Numéro de TVA</h3>
                    <p className="text-sm">{currentClient.vat_number}</p>
                  </div>
                </div>
              )}
              
              {currentClient.address && (
                <div className="flex items-start space-x-3 md:col-span-2 bg-muted/20 p-3 rounded-md">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Adresse</h3>
                    <p className="text-sm">
                      {currentClient.address}
                      {(currentClient.postal_code || currentClient.city) && (
                        <>, {currentClient.postal_code} {currentClient.city}</>
                      )}
                      {currentClient.country && <>, {currentClient.country}</>}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Créé le</h3>
                  <p className="text-sm">{formatDate(currentClient.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Dernière mise à jour</h3>
                  <p className="text-sm">{formatDate(currentClient.updated_at)}</p>
                </div>
              </div>
            </div>
            
            {currentClient.notes && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-4 rounded-md">{currentClient.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Compte utilisateur
            </CardTitle>
            <CardDescription>Accès au portail client</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isRefreshing && (
              <div className="p-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2 mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Rafraîchissement des données...
              </div>
            )}
            
            {hasUserAccount ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-green-50 p-4 rounded-md border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">Compte actif</div>
                    {currentClient.user_account_created_at && (
                      <span className="text-xs text-green-700">
                        Créé le {formatDate(currentClient.user_account_created_at)}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full flex items-center justify-center"
                  onClick={handleResetPassword}
                  disabled={isResettingPassword || !currentClient.email}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {isResettingPassword ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Ce client n'a pas encore de compte utilisateur pour accéder au portail.</p>
                </div>
                {currentClient.email ? (
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
            <CollaboratorForm clientId={id!} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
