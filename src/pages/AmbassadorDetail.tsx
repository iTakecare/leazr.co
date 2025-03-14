
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Mail, Phone, MapPin, ChevronLeft, User, UsersRound, 
  ReceiptEuro, Info, Clock, FileText, Building2
} from "lucide-react";

// Simulation d'une API pour obtenir les détails d'un ambassadeur
const getAmbassadorById = async (id: string) => {
  // Pour la démonstration, nous utilisons des données statiques
  const ambassadors = [
    {
      id: '1',
      name: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      phone: '+33 6 12 34 56 78',
      region: 'Île-de-France',
      clientsCount: 12,
      commissionsTotal: 8750,
      lastCommission: 1250,
      status: 'active',
      notes: 'Très actif dans la région parisienne. Spécialisé dans le secteur médical.',
      created_at: '2023-02-15T10:30:00',
      updated_at: '2023-10-22T14:45:00'
    },
    {
      id: '2',
      name: 'Marie Martin',
      email: 'marie.martin@example.com',
      phone: '+33 6 23 45 67 89',
      region: 'Auvergne-Rhône-Alpes',
      clientsCount: 8,
      commissionsTotal: 5320,
      lastCommission: 980,
      status: 'active',
      notes: 'Couvre principalement Lyon et ses environs. Bon relationnel avec les cliniques privées.',
      created_at: '2023-03-20T11:15:00',
      updated_at: '2023-09-18T16:30:00'
    },
    {
      id: '3',
      name: 'Pierre Bernard',
      email: 'pierre.bernard@example.com',
      phone: '+33 6 34 56 78 90',
      region: 'Nouvelle-Aquitaine',
      clientsCount: 5,
      commissionsTotal: 3150,
      lastCommission: 0,
      status: 'inactive',
      notes: 'Ancien commercial médical. Bon réseau mais moins actif récemment.',
      created_at: '2023-01-10T09:45:00',
      updated_at: '2023-08-05T13:20:00'
    }
  ];
  
  return ambassadors.find(a => a.id === id);
};

// Simulation d'une API pour obtenir les clients d'un ambassadeur
const getClientsByAmbassadorId = async (id: string) => {
  const mockClients = {
    '1': [
      { id: 'c1', name: 'ACME SAS', company: 'ACME', status: 'active', createdAt: '2023-05-12T10:30:00' },
      { id: 'c2', name: 'Dubois Équipements', company: 'Dubois Équipements', status: 'active', createdAt: '2023-06-22T14:15:00' },
      { id: 'c3', name: 'Centre Médical Rivière', company: 'Centre Médical Rivière', status: 'active', createdAt: '2023-08-05T09:45:00' },
    ],
    '2': [
      { id: 'c4', name: 'Clinique du Sport', company: 'Clinique du Sport', status: 'active', createdAt: '2023-07-15T11:20:00' },
      { id: 'c5', name: 'PhysioCare', company: 'PhysioCare', status: 'inactive', createdAt: '2023-09-30T16:00:00' },
    ],
    '3': [
      { id: 'c6', name: 'Cabinet Martin', company: 'Cabinet Martin', status: 'inactive', createdAt: '2023-04-10T08:30:00' },
    ]
  };
  
  return mockClients[id] || [];
};

// Simulation d'une API pour obtenir les commissions d'un ambassadeur
const getCommissionsByAmbassadorId = async (id: string) => {
  const mockCommissions = {
    '1': [
      { id: 'co1', amount: 2500, status: 'paid', client: 'ACME SAS', date: '2023-06-15T10:30:00', description: 'Commission sur vente de matériel' },
      { id: 'co2', amount: 1800, status: 'paid', client: 'Dubois Équipements', date: '2023-07-22T14:15:00', description: 'Commission sur contrat annuel' },
      { id: 'co3', amount: 3200, status: 'paid', client: 'Centre Médical Rivière', date: '2023-09-05T09:45:00', description: 'Commission sur équipement complet' },
      { id: 'co4', amount: 1250, status: 'pending', client: 'ACME SAS', date: '2023-10-18T15:30:00', description: 'Renouvellement contrat' },
    ],
    '2': [
      { id: 'co5', amount: 2100, status: 'paid', client: 'Clinique du Sport', date: '2023-08-12T11:20:00', description: 'Commission sur vente de matériel' },
      { id: 'co6', amount: 2240, status: 'paid', client: 'PhysioCare', date: '2023-09-25T16:00:00', description: 'Commission sur contrat annuel' },
      { id: 'co7', amount: 980, status: 'pending', client: 'Clinique du Sport', date: '2023-10-30T14:45:00', description: 'Extension de contrat' },
    ],
    '3': [
      { id: 'co8', amount: 1650, status: 'paid', client: 'Cabinet Martin', date: '2023-05-05T08:30:00', description: 'Commission sur vente de matériel' },
      { id: 'co9', amount: 1500, status: 'paid', client: 'Cabinet Martin', date: '2023-07-10T13:15:00', description: 'Renouvellement contrat' },
    ]
  };
  
  return mockCommissions[id] || [];
};

export default function AmbassadorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ambassador, setAmbassador] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

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
      
      setAmbassador(ambassadorData);
      
      // Charger les clients
      const clientsData = await getClientsByAmbassadorId(id);
      setClients(clientsData);
      
      // Charger les commissions
      const commissionsData = await getCommissionsByAmbassadorId(id);
      setCommissions(commissionsData);
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

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{ambassador.name}</h1>
          <p className="text-muted-foreground text-lg">{ambassador.region}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/ambassadors")} className="flex items-center">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
          <Button className="shadow-sm">Modifier</Button>
        </div>
      </div>

      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
          <TabsTrigger value="commissions">Commissions ({commissions.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
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
                  
                  {ambassador.region && (
                    <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium">Région</h3>
                        <p className="text-sm">{ambassador.region}</p>
                      </div>
                    </div>
                  )}
                  
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
                  <ReceiptEuro className="h-5 w-5 text-primary" />
                  Performance
                </CardTitle>
                <CardDescription>Statistiques et commissions</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <UsersRound className="h-5 w-5 text-primary" />
                      <div className="font-medium">Clients</div>
                    </div>
                    <div className="text-xl font-bold">{ambassador.clientsCount}</div>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <ReceiptEuro className="h-5 w-5 text-primary" />
                      <div className="font-medium">Commissions totales</div>
                    </div>
                    <div className="text-xl font-bold">{ambassador.commissionsTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                  </div>
                  
                  {ambassador.lastCommission > 0 && (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <ReceiptEuro className="h-5 w-5 text-green-500" />
                        <div className="font-medium">Dernière commission</div>
                      </div>
                      <div className="text-xl font-bold">{ambassador.lastCommission.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="font-medium">Statut</div>
                    </div>
                    <Badge variant={ambassador.status === 'active' ? 'default' : 'secondary'} className={
                      ambassador.status === 'active' 
                        ? "bg-green-100 text-green-800 hover:bg-green-100" 
                        : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                    }>
                      {ambassador.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-primary" />
                Clients
              </CardTitle>
              <CardDescription>Clients amenés par cet ambassadeur</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {clients.length > 0 ? (
                <div className="space-y-4">
                  {clients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/10 transition-colors">
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(client.createdAt)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className={
                          client.status === 'active' 
                            ? "bg-green-100 text-green-800 hover:bg-green-100" 
                            : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }>
                          {client.status === 'active' ? 'Actif' : 'Inactif'}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/clients/${client.id}`)}>
                          Voir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <UsersRound className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">Aucun client</h3>
                  <p className="text-sm text-muted-foreground">Cet ambassadeur n'a pas encore amené de clients.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <ReceiptEuro className="h-5 w-5 text-primary" />
                Commissions
              </CardTitle>
              <CardDescription>Historique des commissions</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {commissions.length > 0 ? (
                <div className="space-y-4">
                  {commissions.map((commission) => (
                    <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/10 transition-colors">
                      <div>
                        <div className="font-medium">{commission.client}</div>
                        <div className="text-sm text-muted-foreground">{commission.description}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(commission.date)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-lg font-bold">{commission.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'} className={
                          commission.status === 'paid' 
                            ? "bg-green-100 text-green-800 hover:bg-green-100" 
                            : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                        }>
                          {commission.status === 'paid' ? 'Payée' : 'En attente'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ReceiptEuro className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">Aucune commission</h3>
                  <p className="text-sm text-muted-foreground">Cet ambassadeur n'a pas encore reçu de commissions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
