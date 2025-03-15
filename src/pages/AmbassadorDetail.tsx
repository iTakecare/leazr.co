
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CollaboratorForm from "@/components/clients/CollaboratorForm";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Building2, Mail, Phone, MapPin, FileText, Clock, UserPlus, KeyRound, Trash, ChevronLeft, User, CheckCircle, 
  AlertCircle, Info, Map
} from "lucide-react";

// Définir l'interface Ambassador pour la page de détail
interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  status: string;
  clientsCount: number;
  commissionsTotal: number;
  lastCommission: number;
  notes?: string;
  collaborators?: Collaborator[];
  user_id?: string;
  has_user_account?: boolean;
  user_account_created_at?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

interface Collaborator {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  department?: string;
}

// Services mock pour ambassadeurs
const resetAmbassadorPassword = async (email: string): Promise<boolean> => {
  // Simuler la réinitialisation du mot de passe
  await new Promise(resolve => setTimeout(resolve, 800));
  return true;
};

const createAccountForAmbassador = async (ambassador: Ambassador): Promise<boolean> => {
  // Simuler la création d'un compte
  await new Promise(resolve => setTimeout(resolve, 1200));
  return true;
};

const getAmbassadorById = async (id: string): Promise<Ambassador | null> => {
  // Simuler le chargement des données de l'ambassadeur
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const mockAmbassadors: Ambassador[] = [
    {
      id: '1',
      name: 'Caroline Dubois',
      email: 'caroline.dubois@example.com',
      phone: '+33 6 11 22 33 44',
      region: 'Île-de-France',
      status: 'active',
      clientsCount: 12,
      commissionsTotal: 8500,
      lastCommission: 750,
      created_at: '2023-02-10T09:30:00Z',
      updated_at: '2023-08-15T14:20:00Z',
      notes: 'Ambassadrice très active dans le secteur médical en Île-de-France.',
      collaborators: [
        {
          id: 'c1',
          name: 'Antoine Martin',
          role: 'Assistant',
          email: 'antoine.martin@example.com',
          phone: '+33 6 22 33 44 55',
          department: 'Support'
        }
      ]
    },
    {
      id: '2',
      name: 'Marc Lefevre',
      email: 'marc.lefevre@example.com',
      phone: '+33 6 33 44 55 66',
      region: 'Auvergne-Rhône-Alpes',
      status: 'active',
      clientsCount: 8,
      commissionsTotal: 6200,
      lastCommission: 550,
      created_at: '2023-03-15T11:45:00Z',
      updated_at: '2023-09-20T10:15:00Z'
    },
    {
      id: '3',
      name: 'Julie Petit',
      email: 'julie.petit@example.com',
      phone: '+33 6 44 55 66 77',
      region: 'Nouvelle-Aquitaine',
      status: 'inactive',
      clientsCount: 5,
      commissionsTotal: 3800,
      lastCommission: 0,
      created_at: '2023-04-20T08:15:00Z',
      updated_at: '2023-10-05T16:30:00Z'
    }
  ];
  
  return mockAmbassadors.find(a => a.id === id) || null;
};

export default function AmbassadorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Fonction pour charger les données de l'ambassadeur
  const fetchAmbassador = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const ambassadorData = await getAmbassadorById(id);
      
      if (!ambassadorData) {
        toast.error("Ambassadeur introuvable");
        navigate("/ambassadors");
        return;
      }
      
      console.log("Ambassador data loaded:", ambassadorData);
      setAmbassador(ambassadorData);
    } catch (error) {
      console.error("Error fetching ambassador:", error);
      toast.error("Erreur lors du chargement de l'ambassadeur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmbassador();
  }, [id, navigate]);

  const handleResetPassword = async () => {
    if (!ambassador?.email) {
      toast.error("Cet ambassadeur n'a pas d'adresse email");
      return;
    }

    setIsResettingPassword(true);
    try {
      const success = await resetAmbassadorPassword(ambassador.email);
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
    if (!ambassador) return;
    
    if (!ambassador.email) {
      toast.error("Cet ambassadeur n'a pas d'adresse email");
      return;
    }
    
    setIsCreatingAccount(true);
    try {
      const success = await createAccountForAmbassador(ambassador);
      if (success) {
        // Recharger les données de l'ambassadeur pour afficher les changements
        await fetchAmbassador();
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3 text-lg">Chargement...</span>
      </div>
    );
  }

  if (!ambassador) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-3xl font-bold text-gray-400">Ambassadeur introuvable</div>
        <Button variant="default" onClick={() => navigate("/ambassadors")}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  // Un compte est considéré comme actif uniquement si has_user_account est true
  const hasUserAccount = Boolean(ambassador.has_user_account);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{ambassador.name}</h1>
          <p className="text-muted-foreground text-lg">Ambassadeur - {ambassador.region}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/ambassadors")} className="flex items-center">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
          <Link to={`/ambassadors/edit/${id}`}>
            <Button className="shadow-sm">Modifier</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-md border-none bg-gradient-to-br from-card to-background">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Informations générales
            </CardTitle>
            <CardDescription>Coordonnées et détails de l'ambassadeur</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ambassador.email && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Email</h3>
                    <p className="text-sm">{ambassador.email}</p>
                  </div>
                </div>
              )}
              
              {ambassador.phone && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Téléphone</h3>
                    <p className="text-sm">{ambassador.phone}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Map className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Région</h3>
                  <p className="text-sm">{ambassador.region}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <BadgePercent className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Commissions totales</h3>
                  <p className="text-sm">{formatCurrency(ambassador.commissionsTotal)}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Créé le</h3>
                  <p className="text-sm">{formatDate(ambassador.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Dernière mise à jour</h3>
                  <p className="text-sm">{formatDate(ambassador.updated_at)}</p>
                </div>
              </div>
            </div>
            
            {ambassador.notes && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-4 rounded-md">{ambassador.notes}</p>
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
            <CardDescription>Accès au portail ambassadeur</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {hasUserAccount ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-green-50 p-4 rounded-md border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">Compte actif</div>
                    {ambassador.user_account_created_at && (
                      <span className="text-xs text-green-700">
                        Créé le {formatDate(ambassador.user_account_created_at)}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full flex items-center justify-center"
                  onClick={handleResetPassword}
                  disabled={isResettingPassword || !ambassador.email}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {isResettingPassword ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Cet ambassadeur n'a pas encore de compte utilisateur pour accéder au portail.</p>
                </div>
                {ambassador.email ? (
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
                    onClick={handleCreateAccount}
                    disabled={isCreatingAccount}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isCreatingAccount ? "Création en cours..." : "Créer un compte ambassadeur"}
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
            <CardDescription>Personnes associées à cet ambassadeur</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <CollaboratorForm clientId={id!} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
