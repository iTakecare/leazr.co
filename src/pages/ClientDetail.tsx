
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollaboratorForm } from "@/components/clients/CollaboratorForm";
import { toast } from "sonner";
import { createAccountForClient, getClientById, resetClientPassword } from "@/services/clientService";
import { Client } from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Mail, Phone, MapPin, FileText, RefreshCcw, UserPlus, User, CalendarDays 
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateAccountDialogOpen, setIsCreateAccountDialogOpen] = useState(false);
  const [isUserAccountCreating, setIsUserAccountCreating] = useState(false);
  const [isPasswordResetSending, setIsPasswordResetSending] = useState(false);

  useEffect(() => {
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

    fetchClient();
  }, [id, navigate]);

  const handleCreateAccount = async () => {
    if (!client) return;
    
    if (!client.email) {
      toast.error("Le client doit avoir un email pour créer un compte");
      return;
    }
    
    setIsUserAccountCreating(true);
    
    try {
      const success = await createAccountForClient(client);
      
      if (success) {
        // Recharger les données du client pour voir les changements
        const updatedClient = await getClientById(id!);
        setClient(updatedClient);
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Erreur lors de la création du compte");
    } finally {
      setIsUserAccountCreating(false);
      setIsCreateAccountDialogOpen(false);
    }
  };

  const handleResetPassword = async () => {
    if (!client || !client.email) return;
    
    setIsPasswordResetSending(true);
    
    try {
      await resetClientPassword(client.email);
      
      // Recharger les données du client
      const updatedClient = await getClientById(id!);
      setClient(updatedClient);
    } catch (error) {
      console.error("Error resetting password:", error);
    } finally {
      setIsPasswordResetSending(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  if (!client) {
    return <div className="flex items-center justify-center h-64">Client introuvable</div>;
  }

  const formatDate = (date: Date | string) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground">{client.company}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/clients/edit/${id}`}>
            <Button variant="outline">Modifier</Button>
          </Link>
          {client.user_id ? (
            <Button 
              variant="outline" 
              onClick={handleResetPassword}
              disabled={isPasswordResetSending}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {isPasswordResetSending ? "Envoi en cours..." : "Réinitialiser mot de passe"}
            </Button>
          ) : (
            <Button 
              onClick={() => setIsCreateAccountDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Créer un compte utilisateur
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
            <CardDescription>Coordonnées et détails du client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span>{client.email || "Non spécifié"}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>{client.phone || "Non spécifié"}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span>{client.company || "Non spécifié"}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>
                  {client.address ? 
                    `${client.address}, ${client.postal_code} ${client.city}, ${client.country}` : 
                    "Adresse non spécifiée"}
                </span>
              </div>
              
              {client.vat_number && (
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span>TVA: {client.vat_number}</span>
                </div>
              )}
              
              {client.user_id && (
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>Compte utilisateur: <Badge variant="outline" className="ml-1 bg-green-100">Actif</Badge></span>
                    {client.user_account_created_at && (
                      <span className="text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 inline mr-1" />
                        Créé le {formatDate(client.user_account_created_at)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {client.notes && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="collaborators" className="flex-1">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="collaborators">Collaborateurs</TabsTrigger>
          </TabsList>
          <TabsContent value="collaborators" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Collaborateurs</CardTitle>
                <CardDescription>Personnes à contacter chez ce client</CardDescription>
              </CardHeader>
              <CardContent>
                <CollaboratorForm clientId={id!} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isCreateAccountDialogOpen} onOpenChange={setIsCreateAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un compte utilisateur</DialogTitle>
            <DialogDescription>
              Un email d'invitation sera envoyé à l'adresse {client.email} pour permettre au client de définir son mot de passe.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateAccountDialogOpen(false)}
              disabled={isUserAccountCreating}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleCreateAccount}
              disabled={isUserAccountCreating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUserAccountCreating ? "Création en cours..." : "Créer le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
