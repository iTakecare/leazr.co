import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Building2, Mail, Phone, MapPin, FileText, Clock, UserPlus, KeyRound, ChevronLeft, User, CheckCircle, 
  AlertCircle, Info, BadgePercent, Users, Receipt, ReceiptText, Loader2, Edit
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAmbassadorById } from "@/services/ambassadorService";

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
  clients?: Client[];
  commissions?: Commission[];
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

const mockAmbassadors: Record<string, Ambassador> = {
  "1": {
    id: '1',
    name: 'Sophie Laurent',
    email: 'sophie.laurent@example.com',
    phone: '+33 6 12 34 56 78',
    region: 'Île-de-France',
    status: 'active',
    clientsCount: 12,
    commissionsTotal: 4500,
    lastCommission: 750,
    created_at: '2023-02-10T09:30:00Z',
    updated_at: '2023-08-15T14:20:00Z',
    notes: 'Ambassadrice très active dans le milieu hospitalier parisien.',
    collaborators: [
      {
        id: 'c1',
        name: 'Antoine Martin',
        role: 'Assistant',
        email: 'antoine.martin@example.com',
        phone: '+33 6 22 33 44 55',
        department: 'Support'
      }
    ],
    clients: [
      {
        id: 'cl1',
        name: 'Cabinet Médical Santé Plus',
        email: 'contact@santeplus.fr',
        status: 'active',
        company: 'Santé Plus',
        createdAt: '2023-03-15',
        totalValue: 2500
      },
      {
        id: 'cl2',
        name: 'Dr. Philippe Martin',
        email: 'p.martin@gmail.com',
        status: 'active',
        company: 'Cabinet Dr. Martin',
        createdAt: '2023-05-20',
        totalValue: 1800
      }
    ],
    commissions: [
      {
        id: 'com1',
        date: '2023-04-15',
        client: 'Cabinet Médical Santé Plus',
        amount: 250,
        status: 'Payée',
        isPaid: true
      },
      {
        id: 'com2',
        date: '2023-06-22',
        client: 'Dr. Philippe Martin',
        amount: 180,
        status: 'Payée',
        isPaid: true
      },
      {
        id: 'com3',
        date: '2023-09-05',
        client: 'Cabinet Médical Santé Plus',
        amount: 320,
        status: 'En attente',
        isPaid: false
      }
    ]
  },
  "2": {
    id: '2',
    name: 'Marc Dubois',
    email: 'marc.dubois@example.com',
    phone: '+33 6 23 45 67 89',
    region: 'Auvergne-Rhône-Alpes',
    status: 'active',
    clientsCount: 8,
    commissionsTotal: 3200,
    lastCommission: 550,
    created_at: '2023-03-15T11:45:00Z',
    updated_at: '2023-09-20T10:15:00Z',
    notes: 'Bonne connaissance du réseau de cliniques privées de Lyon.',
    collaborators: [],
    clients: [
      {
        id: 'cl4',
        name: 'Clinique du Sport',
        email: 'contact@clinique-sport.fr',
        status: 'active',
        company: 'Clinique du Sport',
        createdAt: '2023-04-12',
        totalValue: 1700
      },
      {
        id: 'cl5',
        name: 'Centre Médical Bellevue',
        email: 'info@cm-bellevue.fr',
        status: 'active',
        company: 'CM Bellevue',
        createdAt: '2023-06-18',
        totalValue: 1500
      }
    ],
    commissions: [
      {
        id: 'com4',
        date: '2023-05-20',
        client: 'Clinique du Sport',
        amount: 170,
        status: 'Payée',
        isPaid: true
      },
      {
        id: 'com5',
        date: '2023-07-15',
        client: 'Centre Médical Bellevue',
        amount: 150,
        status: 'Payée',
        isPaid: true
      },
      {
        id: 'com6',
        date: '2023-10-10',
        client: 'Clinique du Sport',
        amount: 230,
        status: 'En attente',
        isPaid: false
      }
    ]
  },
  "3": {
    id: '3',
    name: 'Émilie Moreau',
    email: 'emilie.moreau@example.com',
    phone: '+33 6 34 56 78 90',
    region: 'Provence-Alpes-Côte d\'Azur',
    status: 'inactive',
    clientsCount: 5,
    commissionsTotal: 1800,
    lastCommission: 0,
    created_at: '2023-04-20T08:15:00Z',
    updated_at: '2023-10-05T16:30:00Z',
    notes: 'En pause temporaire pour congé maternité.',
    has_user_account: true,
    user_account_created_at: '2023-04-25T10:00:00Z'
  },
  "4": {
    id: '4',
    name: 'Thomas Bernard',
    email: 'thomas.bernard@example.com',
    phone: '+33 6 45 67 89 01',
    region: 'Grand Est',
    status: 'active',
    clientsCount: 7,
    commissionsTotal: 2800,
    lastCommission: 420,
    created_at: '2023-05-12T13:20:00Z',
    updated_at: '2023-11-08T09:45:00Z',
    notes: 'Spécialisé dans les équipements de rééducation.'
  },
  "5": {
    id: '5',
    name: 'Lucie Petit',
    email: 'lucie.petit@example.com',
    phone: '+33 6 56 78 90 12',
    region: 'Bretagne',
    status: 'active',
    clientsCount: 6,
    commissionsTotal: 2100,
    lastCommission: 350,
    created_at: '2023-06-18T15:30:00Z',
    updated_at: '2023-12-02T11:10:00Z',
    notes: 'Excellente connaissance du tissu médical local.'
  }
};

const getAmbassadorById = async (id: string): Promise<Ambassador | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Récupération des données de l'ambassadeur ID: ${id}`);
      const ambassador = mockAmbassadors[id];
      resolve(ambassador || null);
    }, 600);
  });
};

const resetAmbassadorPassword = async (email: string): Promise<boolean> => {
  // Simuler la réinitialisation du mot de passe
  await new Promise(resolve => setTimeout(resolve, 800));
  console.log(`Demande de réinitialisation de mot de passe pour: ${email}`);
  return true;
};

const createAccountForAmbassador = async (ambassador: Ambassador): Promise<boolean> => {
  // Simuler la création d'un compte
  await new Promise(resolve => setTimeout(resolve, 1200));
  console.log(`Création de compte pour l'ambassadeur: ${ambassador.name}`);
  
  // Mettre à jour l'ambassadeur dans la base de données mockée
  if (mockAmbassadors[ambassador.id]) {
    mockAmbassadors[ambassador.id] = {
      ...mockAmbassadors[ambassador.id],
      has_user_account: true,
      user_account_created_at: new Date().toISOString()
    };
  }
  
  return true;
};

export default function AmbassadorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAmbassador = async () => {
    if (!id) {
      toast.error("ID d'ambassadeur manquant");
      navigate("/ambassadors");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching ambassador with ID:", id);
      const ambassadorData = await getAmbassadorById(id);
      
      if (!ambassadorData) {
        console.error("Ambassador not found for ID:", id);
        setError("Ambassadeur introuvable");
        toast.error("Ambassadeur introuvable");
        setLoading(false);
        return;
      }
      
      console.log("Ambassador data loaded:", ambassadorData);
      setAmbassador(ambassadorData);
    } catch (error) {
      console.error("Error fetching ambassador:", error);
      setError("Erreur lors du chargement des données de l'ambassadeur");
      toast.error("Erreur lors du chargement des données de l'ambassadeur");
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-3 text-lg">Chargement...</span>
      </div>
    );
  }

  if (error || !ambassador) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div className="text-3xl font-bold text-gray-400">{error || "Ambassadeur introuvable"}</div>
          <p className="text-muted-foreground">L'ambassadeur que vous recherchez n'existe pas ou n'est plus disponible.</p>
          <Button variant="default" onClick={() => navigate("/ambassadors")}>
            Retour à la liste des ambassadeurs
          </Button>
        </div>
      </div>
    );
  }

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
            <Button className="shadow-sm flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
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
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
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
          </div>
        </TabsContent>
        
        <TabsContent value="clients" className="space-y-6">
          <Card className="shadow-md border-none">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Clients
              </CardTitle>
              <CardDescription>Clients amenés par cet ambassadeur</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {ambassador.clients && ambassador.clients.length > 0 ? (
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
                    {ambassador.clients.map((client) => (
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
                  <p className="text-muted-foreground">Aucun client pour cet ambassadeur</p>
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
              {ambassador.commissions && ambassador.commissions.length > 0 ? (
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
                    {ambassador.commissions.map((commission) => (
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
        
        <TabsContent value="collaborators" className="space-y-6">
          <Card className="shadow-md border-none">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Collaborateurs
              </CardTitle>
              <CardDescription>Personnes associées à cet ambassadeur</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {ambassador.collaborators && ambassador.collaborators.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Département</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ambassador.collaborators.map((collab) => (
                      <TableRow key={collab.id}>
                        <TableCell className="font-medium">{collab.name}</TableCell>
                        <TableCell>{collab.role}</TableCell>
                        <TableCell>{collab.email}</TableCell>
                        <TableCell>{collab.phone || "-"}</TableCell>
                        <TableCell>{collab.department || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10">
                  <UserPlus className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Aucun collaborateur pour cet ambassadeur</p>
                  <p className="text-xs text-muted-foreground mt-2">Ajoutez des collaborateurs pour faciliter la communication</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

