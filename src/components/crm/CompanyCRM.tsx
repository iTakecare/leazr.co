import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Users, 
  FileText, 
  HandHeart, 
  Building, 
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import { useCompanyCRM } from "@/hooks/useCompanyDashboard";

const CompanyCRM = () => {
  const { 
    clients, 
    offers, 
    contracts, 
    ambassadors, 
    partners, 
    stats, 
    isLoading 
  } = useCompanyCRM();
  
  // Debug logs pour diagnostiquer les données affichées
  console.log("🔍 CRM RENDER - Stats:", stats);
  console.log("🔍 CRM RENDER - Clients count:", clients?.length || 0);
  console.log("🔍 CRM RENDER - Offers count:", offers?.length || 0);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("clients");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      pending: "secondary", 
      inactive: "outline",
      completed: "default",
      cancelled: "destructive"
    };
    
    const labels: Record<string, string> = {
      active: "Actif",
      pending: "En attente",
      inactive: "Inactif",
      completed: "Terminé",
      cancelled: "Annulé"
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">CRM</h1>
            <p className="text-muted-foreground">Gestion de la relation client</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CRM</h1>
          <p className="text-muted-foreground">Gestion de la relation client</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtrer
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Offres</p>
                <p className="text-2xl font-bold">{stats.totalOffers}</p>
              </div>
              <FileText className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contrats</p>
                <p className="text-2xl font-bold">{stats.totalContracts}</p>
              </div>
              <HandHeart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ambassadeurs</p>
                <p className="text-2xl font-bold">{stats.totalAmbassadors}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Partenaires</p>
                <p className="text-2xl font-bold">{stats.totalPartners}</p>
              </div>
              <Building className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Onglets CRM */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="offers" className="gap-2">
            <FileText className="h-4 w-4" />
            Offres
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2">
            <HandHeart className="h-4 w-4" />
            Contrats
          </TabsTrigger>
          <TabsTrigger value="ambassadors" className="gap-2">
            <Users className="h-4 w-4" />
            Ambassadeurs
          </TabsTrigger>
          <TabsTrigger value="partners" className="gap-2">
            <Building className="h-4 w-4" />
            Partenaires
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clients de l'entreprise</CardTitle>
              <CardDescription>
                Gérez vos clients et leurs informations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients
                    .filter(client => 
                      !searchTerm || 
                      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      client.email?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.company || "—"}</TableCell>
                        <TableCell>{client.email || "—"}</TableCell>
                        <TableCell>{getStatusBadge(client.status || 'active')}</TableCell>
                        <TableCell>{formatDate(client.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Offres de l'entreprise</CardTitle>
              <CardDescription>
                Suivez l'évolution de vos offres commerciales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers
                    .filter(offer => 
                      !searchTerm || 
                      offer.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell className="font-medium">{offer.client_name}</TableCell>
                        <TableCell>{formatCurrency(offer.amount || 0)}</TableCell>
                        <TableCell>{getStatusBadge(offer.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{offer.type || 'Standard'}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(offer.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contrats de l'entreprise</CardTitle>
              <CardDescription>
                Gérez vos contrats signés et en cours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Paiement mensuel</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts
                    .filter(contract => 
                      !searchTerm || 
                      contract.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.client_name}</TableCell>
                        <TableCell>{formatCurrency(contract.monthly_payment || 0)}</TableCell>
                        <TableCell>{getStatusBadge(contract.status)}</TableCell>
                        <TableCell>{formatDate(contract.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ambassadors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ambassadeurs de l'entreprise</CardTitle>
              <CardDescription>
                Gérez votre réseau d'ambassadeurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Région</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ambassadors
                    .filter(ambassador => 
                      !searchTerm || 
                      ambassador.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      ambassador.email?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((ambassador) => (
                      <TableRow key={ambassador.id}>
                        <TableCell className="font-medium">{ambassador.name}</TableCell>
                        <TableCell>{ambassador.email}</TableCell>
                        <TableCell>{ambassador.region || "—"}</TableCell>
                        <TableCell>{ambassador.clients_count || 0}</TableCell>
                        <TableCell>{getStatusBadge(ambassador.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Partenaires de l'entreprise</CardTitle>
              <CardDescription>
                Gérez vos partenaires commerciaux
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners
                    .filter(partner => 
                      !searchTerm || 
                      partner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      partner.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell className="font-medium">{partner.name}</TableCell>
                        <TableCell>{partner.contact_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{partner.type}</Badge>
                        </TableCell>
                        <TableCell>{partner.clients_count || 0}</TableCell>
                        <TableCell>{getStatusBadge(partner.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanyCRM;