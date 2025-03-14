
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
  Mail, Phone, ChevronLeft, Building2, User, BadgePercent, 
  FileText, Info, Clock, UsersRound, ReceiptEuro, FileSpreadsheet
} from "lucide-react";

// Simulation d'une API pour obtenir les détails d'un partenaire
const getPartnerById = async (id: string) => {
  // Pour la démonstration, nous utilisons des données statiques
  const partners = [
    {
      id: '1',
      name: 'TechSolutions SAS',
      contactName: 'Alexandre Martin',
      email: 'contact@techsolutions.com',
      phone: '+33 1 23 45 67 89',
      type: 'Revendeur',
      commissionsTotal: 12500,
      status: 'active',
      notes: 'Partenaire depuis 2020. Couvre principalement le secteur des cliniques privées.',
      created_at: '2020-04-15T10:30:00',
      updated_at: '2023-11-12T14:45:00'
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
      notes: 'Spécialisé dans les solutions numériques pour le secteur médical.',
      created_at: '2021-06-20T11:15:00',
      updated_at: '2023-10-08T16:30:00'
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
      notes: 'Ancien partenaire très actif. Moins présent depuis 2023.',
      created_at: '2019-10-10T09:45:00',
      updated_at: '2023-07-25T13:20:00'
    }
  ];
  
  return partners.find(p => p.id === id);
};

// Simulation d'une API pour obtenir les clients d'un partenaire
const getClientsByPartnerId = async (id: string) => {
  const mockClients = {
    '1': [
      { id: 'c1', name: 'Hôpital Saint-Louis', company: 'Hôpital Saint-Louis', status: 'active', createdAt: '2023-04-12T10:30:00' },
      { id: 'c2', name: 'Clinique des Alpes', company: 'Clinique des Alpes', status: 'active', createdAt: '2023-06-18T14:15:00' },
      { id: 'c3', name: 'Centre de Rééducation Paris', company: 'Centre de Rééducation Paris', status: 'active', createdAt: '2023-07-22T09:45:00' },
    ],
    '2': [
      { id: 'c4', name: 'Cabinet Médical Lyon', company: 'Cabinet Médical Lyon', status: 'active', createdAt: '2023-05-15T11:20:00' },
      { id: 'c5', name: 'Clinique du Sport Bordeaux', company: 'Clinique du Sport Bordeaux', status: 'active', createdAt: '2023-08-30T16:00:00' },
    ],
    '3': [
      { id: 'c6', name: 'Centre Orthopédique Marseille', company: 'Centre Orthopédique Marseille', status: 'inactive', createdAt: '2023-03-10T08:30:00' },
    ]
  };
  
  return mockClients[id] || [];
};

// Simulation d'une API pour obtenir les commissions d'un partenaire
const getCommissionsByPartnerId = async (id: string) => {
  const mockCommissions = {
    '1': [
      { id: 'co1', amount: 3500, status: 'paid', client: 'Hôpital Saint-Louis', date: '2023-05-15T10:30:00', description: 'Commission sur vente initiale' },
      { id: 'co2', amount: 2800, status: 'paid', client: 'Clinique des Alpes', date: '2023-07-22T14:15:00', description: 'Commission sur contrat annuel' },
      { id: 'co3', amount: 4200, status: 'paid', client: 'Centre de Rééducation Paris', date: '2023-08-05T09:45:00', description: 'Commission sur équipement complet' },
      { id: 'co4', amount: 2000, status: 'pending', client: 'Hôpital Saint-Louis', date: '2023-10-18T15:30:00', description: 'Renouvellement contrat' },
    ],
    '2': [
      { id: 'co5', amount: 3100, status: 'paid', client: 'Cabinet Médical Lyon', date: '2023-06-12T11:20:00', description: 'Commission sur vente de matériel' },
      { id: 'co6', amount: 2850, status: 'paid', client: 'Clinique du Sport Bordeaux', date: '2023-08-25T16:00:00', description: 'Commission sur contrat annuel' },
      { id: 'co7', amount: 2800, status: 'pending', client: 'Cabinet Médical Lyon', date: '2023-10-30T14:45:00', description: 'Extension de contrat' },
    ],
    '3': [
      { id: 'co8', amount: 2650, status: 'paid', client: 'Centre Orthopédique Marseille', date: '2023-04-05T08:30:00', description: 'Commission sur vente de matériel' },
      { id: 'co9', amount: 2650, status: 'paid', client: 'Centre Orthopédique Marseille', date: '2023-07-10T13:15:00', description: 'Renouvellement contrat' },
    ]
  };
  
  return mockCommissions[id] || [];
};

// Simulation d'une API pour obtenir les offres d'un partenaire
const getOffersByPartnerId = async (id: string) => {
  const mockOffers = {
    '1': [
      { id: 'o1', title: 'Équipement Salle Kiné', clientName: 'Hôpital Saint-Louis', amount: 45000, status: 'signed', createdAt: '2023-04-15T10:30:00' },
      { id: 'o2', title: 'Maintenance Équipements', clientName: 'Clinique des Alpes', amount: 28000, status: 'signed', createdAt: '2023-06-20T14:15:00' },
      { id: 'o3', title: 'Solution complète rééducation', clientName: 'Centre de Rééducation Paris', amount: 72000, status: 'pending', createdAt: '2023-09-05T09:45:00' },
    ],
    '2': [
      { id: 'o4', title: 'Équipement Cabinet', clientName: 'Cabinet Médical Lyon', amount: 32000, status: 'signed', createdAt: '2023-05-18T11:20:00' },
      { id: 'o5', title: 'Solution Sport Pro', clientName: 'Clinique du Sport Bordeaux', amount: 58000, status: 'signed', createdAt: '2023-08-25T16:00:00' },
      { id: 'o6', title: 'Extension Matériel', clientName: 'Cabinet Médical Lyon', amount: 18500, status: 'pending', createdAt: '2023-10-12T14:45:00' },
    ],
    '3': [
      { id: 'o7', title: 'Équipement Centre', clientName: 'Centre Orthopédique Marseille', amount: 42000, status: 'signed', createdAt: '2023-03-15T08:30:00' },
      { id: 'o8', title: 'Maintenance Annuelle', clientName: 'Centre Orthopédique Marseille', amount: 12000, status: 'declined', createdAt: '2023-09-10T13:15:00' },
    ]
  };
  
  return mockOffers[id] || [];
};

export default function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

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
      
      setPartner(partnerData);
      
      // Charger les clients
      const clientsData = await getClientsByPartnerId(id);
      setClients(clientsData);
      
      // Charger les commissions
      const commissionsData = await getCommissionsByPartnerId(id);
      setCommissions(commissionsData);
      
      // Charger les offres
      const offersData = await getOffersByPartnerId(id);
      setOffers(offersData);
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

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{partner.name}</h1>
          <p className="text-muted-foreground text-lg">{partner.type}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/partners")} className="flex items-center">
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
          <TabsTrigger value="offers">Offres ({offers.length})</TabsTrigger>
          <TabsTrigger value="commissions">Commissions ({commissions.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
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
                  <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium">Contact principal</h3>
                      <p className="text-sm">{partner.contactName}</p>
                    </div>
                  </div>
                  
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
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium">Type</h3>
                      <p className="text-sm">{partner.type}</p>
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
                  <BadgePercent className="h-5 w-5 text-primary" />
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
                    <div className="text-xl font-bold">{clients.length}</div>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      <div className="font-medium">Offres</div>
                    </div>
                    <div className="text-xl font-bold">{offers.length}</div>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <ReceiptEuro className="h-5 w-5 text-primary" />
                      <div className="font-medium">Commissions totales</div>
                    </div>
                    <div className="text-xl font-bold">{partner.commissionsTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="font-medium">Statut</div>
                    </div>
                    <Badge variant={partner.status === 'active' ? 'default' : 'secondary'} className={
                      partner.status === 'active' 
                        ? "bg-green-100 text-green-800 hover:bg-green-100" 
                        : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                    }>
                      {partner.status === 'active' ? 'Actif' : 'Inactif'}
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
              <CardDescription>Clients amenés par ce partenaire</CardDescription>
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
                  <p className="text-sm text-muted-foreground">Ce partenaire n'a pas encore amené de clients.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="offers" className="space-y-4">
          <Card>
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Offres
              </CardTitle>
              <CardDescription>Offres proposées par ce partenaire</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {offers.length > 0 ? (
                <div className="space-y-4">
                  {offers.map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/10 transition-colors">
                      <div>
                        <div className="font-medium">{offer.title}</div>
                        <div className="text-sm text-muted-foreground">Client: {offer.clientName}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(offer.createdAt)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-lg font-bold">{offer.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <Badge variant={
                          offer.status === 'signed' ? 'default' : 
                          offer.status === 'pending' ? 'secondary' : 
                          'destructive'
                        } className={
                          offer.status === 'signed' 
                            ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                          offer.status === 'pending'
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                            : "bg-red-100 text-red-800 hover:bg-red-100"
                        }>
                          {offer.status === 'signed' ? 'Signée' : 
                           offer.status === 'pending' ? 'En attente' : 'Refusée'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">Aucune offre</h3>
                  <p className="text-sm text-muted-foreground">Ce partenaire n'a pas encore proposé d'offres.</p>
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
                  <p className="text-sm text-muted-foreground">Ce partenaire n'a pas encore reçu de commissions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
