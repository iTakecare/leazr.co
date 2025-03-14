
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CollaboratorForm from "@/components/clients/CollaboratorForm";
import { toast } from "sonner";
import { getClientById, resetClientPassword, createAccountForClient } from "@/services/clientService";
import { Client } from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Building2, Mail, Phone, MapPin, FileText, Clock, UserPlus, KeyRound, Trash
} from "lucide-react";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

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
        // Recharger les données du client pour afficher les changements
        await fetchClient();
        toast.success("Compte utilisateur créé et email de configuration envoyé");
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

  // Afficher les informations de débogage complètes
  console.log("Client account status debug:", { 
    client_id: client.id,
    has_user_account: client.has_user_account,
    user_id: client.user_id,
    user_account_created_at: client.user_account_created_at
  });

  // Un compte est considéré comme actif uniquement si has_user_account est true
  const hasUserAccount = Boolean(client.has_user_account);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          {client.company && (
            <p className="text-muted-foreground text-lg">{client.company}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/clients")}>
            Retour
          </Button>
          <Link to={`/clients/edit/${id}`}>
            <Button>Modifier</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-md">
          <CardHeader className="bg-muted/50 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Informations générales
            </CardTitle>
            <CardDescription>Coordonnées et détails du client</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {client.email && (
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Email</h3>
                    <p className="text-sm">{client.email}</p>
                  </div>
                </div>
              )}
              
              {client.phone && (
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Téléphone</h3>
                    <p className="text-sm">{client.phone}</p>
                  </div>
                </div>
              )}
              
              {client.vat_number && (
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Numéro de TVA</h3>
                    <p className="text-sm">{client.vat_number}</p>
                  </div>
                </div>
              )}
              
              {client.address && (
                <div className="flex items-start space-x-3 md:col-span-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Adresse</h3>
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
              
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Créé le</h3>
                  <p className="text-sm">{formatDate(client.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Dernière mise à jour</h3>
                  <p className="text-sm">{formatDate(client.updated_at)}</p>
                </div>
              </div>
            </div>
            
            {client.notes && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-3 rounded-md">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="bg-muted/50 pb-4">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Compte utilisateur
            </CardTitle>
            <CardDescription>Accès au portail client</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {hasUserAccount ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                    Compte actif
                  </Badge>
                  {client.user_account_created_at && (
                    <span className="text-xs text-muted-foreground">
                      depuis le {formatDate(client.user_account_created_at)}
                    </span>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={handleResetPassword}
                  disabled={isResettingPassword || !client.email}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {isResettingPassword ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-md text-sm">
                  <p>Ce client n'a pas encore de compte utilisateur.</p>
                </div>
                {client.email ? (
                  <Button 
                    className="w-full"
                    onClick={handleCreateAccount}
                    disabled={isCreatingAccount}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isCreatingAccount ? "Création en cours..." : "Créer un compte client"}
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Une adresse email est nécessaire pour créer un compte.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-md">
          <CardHeader className="bg-muted/50">
            <CardTitle>Collaborateurs</CardTitle>
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
