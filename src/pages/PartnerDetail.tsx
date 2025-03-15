
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartnerFormValues } from "@/components/crm/forms/PartnerForm";
import CollaboratorForm from "@/components/clients/CollaboratorForm";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Building2, Mail, Phone, MapPin, FileText, Clock, UserPlus, KeyRound, Trash, ChevronLeft, User, CheckCircle, 
  AlertCircle, Info, BadgePercent
} from "lucide-react";

// Définir l'interface Partner pour la page de détail
interface Partner extends PartnerFormValues {
  id: string;
  commissionsTotal: number;
  status: string;
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

// Services mock pour partenaires
const resetPartnerPassword = async (email: string): Promise<boolean> => {
  // Simuler la réinitialisation du mot de passe
  await new Promise(resolve => setTimeout(resolve, 800));
  return true;
};

const createAccountForPartner = async (partner: Partner): Promise<boolean> => {
  // Simuler la création d'un compte
  await new Promise(resolve => setTimeout(resolve, 1200));
  return true;
};

const getPartnerById = async (id: string): Promise<Partner | null> => {
  // Simuler le chargement des données du partenaire
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const mockPartners: Partner[] = [
    {
      id: '1',
      name: 'TechSolutions SAS',
      contactName: 'Alexandre Martin',
      email: 'contact@techsolutions.com',
      phone: '+33 1 23 45 67 89',
      type: 'Revendeur',
      commissionsTotal: 12500,
      status: 'active',
      created_at: '2023-01-15T10:00:00Z',
      updated_at: '2023-01-15T10:00:00Z',
      notes: 'Partenaire depuis janvier 2023. Spécialisé dans les équipements médicaux.',
      collaborators: [
        {
          id: 'c1',
          name: 'Sophie Dubois',
          role: 'Responsable Commercial',
          email: 'sophie.dubois@techsolutions.com',
          phone: '+33 6 12 34 56 78',
          department: 'Commercial'
        }
      ]
    },
    {
      id: '2',
      name: 'Digital Partners',
      contactName: 'Sophie Dubois',
      email: 'info@digitalpartners.com',
      phone: '+33 1 34 56 78 90',
      type: 'Intégrateur',
      commissionsTotal: 8750,
      status: 'active',
      created_at: '2023-02-20T14:30:00Z',
      updated_at: '2023-02-20T14:30:00Z'
    },
    {
      id: '3',
      name: 'Innov IT',
      contactName: 'Thomas Petit',
      email: 'contact@innovit.fr',
      phone: '+33 1 45 67 89 01',
      type: 'Consultant',
      commissionsTotal: 5300,
      status: 'inactive',
      created_at: '2023-03-10T09:15:00Z',
      updated_at: '2023-03-10T09:15:00Z'
    }
  ];
  
  return mockPartners.find(p => p.id === id) || null;
};

export default function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Fonction pour charger les données du partenaire
  const fetchPartner = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const partnerData = await getPartnerById(id);
      
      if (!partnerData) {
        toast.error("Partenaire introuvable");
        navigate("/partners");
        return;
      }
      
      console.log("Partner data loaded:", partnerData);
      setPartner(partnerData);
    } catch (error) {
      console.error("Error fetching partner:", error);
      toast.error("Erreur lors du chargement du partenaire");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartner();
  }, [id, navigate]);

  const handleResetPassword = async () => {
    if (!partner?.email) {
      toast.error("Ce partenaire n'a pas d'adresse email");
      return;
    }

    setIsResettingPassword(true);
    try {
      const success = await resetPartnerPassword(partner.email);
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
    if (!partner) return;
    
    if (!partner.email) {
      toast.error("Ce partenaire n'a pas d'adresse email");
      return;
    }
    
    setIsCreatingAccount(true);
    try {
      const success = await createAccountForPartner(partner);
      if (success) {
        // Recharger les données du partenaire pour afficher les changements
        await fetchPartner();
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

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-3xl font-bold text-gray-400">Partenaire introuvable</div>
        <Button variant="default" onClick={() => navigate("/partners")}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  // Un compte est considéré comme actif uniquement si has_user_account est true
  const hasUserAccount = Boolean(partner.has_user_account);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{partner.name}</h1>
          <p className="text-muted-foreground text-lg">{partner.contactName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/partners")} className="flex items-center">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
          <Link to={`/partners/edit/${id}`}>
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
            <CardDescription>Coordonnées et détails du partenaire</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {partner.email && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Email</h3>
                    <p className="text-sm">{partner.email}</p>
                  </div>
                </div>
              )}
              
              {partner.phone && (
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Téléphone</h3>
                    <p className="text-sm">{partner.phone}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <BadgePercent className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Type de partenaire</h3>
                  <p className="text-sm">{partner.type}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <BadgePercent className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Commissions totales</h3>
                  <p className="text-sm">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(partner.commissionsTotal)}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Créé le</h3>
                  <p className="text-sm">{formatDate(partner.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Dernière mise à jour</h3>
                  <p className="text-sm">{formatDate(partner.updated_at)}</p>
                </div>
              </div>
            </div>
            
            {partner.notes && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-4 rounded-md">{partner.notes}</p>
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
            <CardDescription>Accès au portail partenaire</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {hasUserAccount ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-green-50 p-4 rounded-md border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">Compte actif</div>
                    {partner.user_account_created_at && (
                      <span className="text-xs text-green-700">
                        Créé le {formatDate(partner.user_account_created_at)}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full flex items-center justify-center"
                  onClick={handleResetPassword}
                  disabled={isResettingPassword || !partner.email}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {isResettingPassword ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Ce partenaire n'a pas encore de compte utilisateur pour accéder au portail.</p>
                </div>
                {partner.email ? (
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
                    onClick={handleCreateAccount}
                    disabled={isCreatingAccount}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isCreatingAccount ? "Création en cours..." : "Créer un compte partenaire"}
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
            <CardDescription>Personnes à contacter chez ce partenaire</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <CollaboratorForm clientId={id!} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
