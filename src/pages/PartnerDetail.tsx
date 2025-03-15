
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
  Building2, Mail, Phone, MapPin, FileText, Clock, UserPlus, KeyRound, ChevronLeft, User, CheckCircle, 
  AlertCircle, Info, BadgePercent, Users, Receipt, ReceiptText, Building
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Définir l'interface Partner pour la page de détail
interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "Revendeur" | "Intégrateur" | "Consultant";
  contactName: string;
  status: string;
  clientsCount: number;
  commissionsTotal: number;
  lastCommission: number;
  notes?: string;
  collaborators?: Collaborator[];
  clients?: Client[];
  commissions?: Commission[];
  offers?: Offer[];
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

interface Client {
  id: string;
  name: string;
  email: string;
  status: string;
  company?: string;
  createdAt: string;
  totalValue: number;
}

interface Commission {
  id: string;
  date: string;
  client: string;
  amount: number;
  status: string;
  isPaid: boolean;
}

interface Offer {
  id: string;
  client: string;
  amount: number;
  status: string;
  date: string;
  description: string;
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
      name: 'TechMed Solutions',
      email: 'contact@techmed.fr',
      phone: '+33 1 23 45 67 89',
      type: 'Revendeur',
      contactName: 'Sophie Martin',
      status: 'active',
      clientsCount: 15,
      commissionsTotal: 12500,
      lastCommission: 850,
      created_at: '2023-01-15T09:30:00Z',
      updated_at: '2023-09-10T14:20:00Z',
      notes: 'Partenaire spécialisé dans la vente d\'équipements médicaux de diagnostic.',
      collaborators: [
        {
          id: 'c1',
          name: 'Marc Dupont',
          role: 'Commercial',
          email: 'marc.dupont@techmed.fr',
          phone: '+33 6 11 22 33 44',
          department: 'Ventes'
        },
        {
          id: 'c2',
          name: 'Julie Lenoir',
          role: 'Support Technique',
          email: 'julie.lenoir@techmed.fr',
          phone: '+33 6 22 33 44 55',
          department: 'Technique'
        }
      ],
      clients: [
        {
          id: 'cl1',
          name: 'Clinique Saint-Joseph',
          email: 'contact@clinique-sj.fr',
          status: 'active',
          company: 'Clinique Saint-Joseph',
          createdAt: '2023-02-15',
          totalValue: 5800
        },
        {
          id: 'cl2',
          name: 'Centre Médical Parisien',
          email: 'contact@cm-paris.fr',
          status: 'active',
          company: 'Centre Médical Parisien',
          createdAt: '2023-04-22',
          totalValue: 4200
        }
      ],
      commissions: [
        {
          id: 'com1',
          date: '2023-03-10',
          client: 'Clinique Saint-Joseph',
          amount: 580,
          status: 'Payée',
          isPaid: true
        },
        {
          id: 'com2',
          date: '2023-05-12',
          client: 'Centre Médical Parisien',
          amount: 420,
          status: 'Payée',
          isPaid: true
        },
        {
          id: 'com3',
          date: '2023-09-05',
          client: 'Hôpital de Lyon',
          amount: 850,
          status: 'En attente',
          isPaid: false
        }
      ],
      offers: [
        {
          id: 'o1',
          client: 'Clinique Saint-Joseph',
          amount: 12500,
          status: 'Acceptée',
          date: '2023-02-10',
          description: 'Équipement complet de moniteurs cardiaques'
        },
        {
          id: 'o2',
          client: 'Centre Médical Parisien',
          amount: 9800,
          status: 'Acceptée',
          date: '2023-04-18',
          description: 'Échographes de dernière génération'
        },
        {
          id: 'o3',
          client: 'Hôpital de Lyon',
          amount: 15600,
          status: 'En attente',
          date: '2023-08-25',
          description: 'Système de surveillance des patients'
        }
      ]
    },
    {
      id: '2',
      name: 'MedIntegra',
      email: 'info@medintegra.com',
      phone: '+33 2 34 56 78 90',
      type: 'Intégrateur',
      contactName: 'Thomas Bernard',
      status: 'active',
      clientsCount: 8,
      commissionsTotal: 7200,
      lastCommission: 650,
      created_at: '2023-03-20T11:15:00Z',
      updated_at: '2023-08-05T16:40:00Z'
    },
    {
      id: '3',
      name: 'ConsultSanté',
      email: 'contact@consultsante.fr',
      phone: '+33 3 45 67 89 01',
      type: 'Consultant',
      contactName: 'Émilie Durand',
      status: 'inactive',
      clientsCount: 4,
      commissionsTotal: 3200,
      lastCommission: 0,
      created_at: '2023-04-05T10:00:00Z',
      updated_at: '2023-07-18T09:25:00Z'
    }
  ];
  
  return mockPartners.find(p => p.id === id) || null;
};

export default function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
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
          <p className="text-muted-foreground text-lg">Partenaire - {partner.type}</p>
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

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="offers">Offres</TabsTrigger>
          <TabsTrigger value="collaborators">Collaborateurs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 shadow-md border-none bg-gradient-to-br from-card to-background">
              <CardHeader className="bg-muted/50 pb-4 border-b">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
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
                    <Building className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium">Type</h3>
                      <p className="text-sm">{partner.type}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium">Contact principal</h3>
                      <p className="text-sm">{partner.contactName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                    <BadgePercent className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium">Commissions totales</h3>
                      <p className="text-sm">{formatCurrency(partner.commissionsTotal)}</p>
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
          </div>
        </TabsContent>
        
        <TabsContent value="clients" className="space-y-6">
          <Card className="shadow-md border-none">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Clients
              </CardTitle>
              <CardDescription>Clients amenés par ce partenaire</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {partner.clients && partner.clients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Date d'acquisition</TableHead>
                      <TableHead className="text-right">Valeur totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partner.clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>{client.company || "-"}</TableCell>
                        <TableCell>{client.createdAt}</TableCell>
                        <TableCell className="text-right">{formatCurrency(client.totalValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Aucun client pour ce partenaire</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="commissions" className="space-y-6">
          <Card className="shadow-md border-none">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-primary" />
                Commissions
              </CardTitle>
              <CardDescription>Historique des commissions</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {partner.commissions && partner.commissions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partner.commissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell>{commission.date}</TableCell>
                        <TableCell>{commission.client}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(commission.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={commission.isPaid ? "default" : "outline"} className={
                            commission.isPaid 
                              ? "bg-green-50 text-green-700 border-green-200" 
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }>
                            {commission.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10">
                  <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Aucune commission enregistrée</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="offers" className="space-y-6">
          <Card className="shadow-md border-none">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Offres
              </CardTitle>
              <CardDescription>Offres créées par ce partenaire</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {partner.offers && partner.offers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partner.offers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>{offer.date}</TableCell>
                        <TableCell>{offer.client}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{offer.description}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(offer.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={offer.status === 'Acceptée' ? "default" : "outline"} className={
                            offer.status === 'Acceptée'
                              ? "bg-green-50 text-green-700 border-green-200" 
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }>
                            {offer.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Aucune offre pour ce partenaire</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="collaborators" className="space-y-6">
          <Card className="shadow-md border-none">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Collaborateurs
              </CardTitle>
              <CardDescription>Personnes associées à ce partenaire</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <CollaboratorForm clientId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
