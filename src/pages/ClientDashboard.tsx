
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import {
  FileText,
  Laptop,
  Clock,
  ChevronRight,
  Plus,
  Loader2,
  RefreshCw,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getClientIdForUser } from "@/utils/clientUserAssociation";
import { useClientOffers } from "@/hooks/useClientOffers";
import { useClientContracts } from "@/hooks/useClientContracts";
import { getClientById } from "@/services/clientService";
import { Client } from "@/types/client";

const ClientDashboard = () => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  
  // Pass clientId to the hooks for better data fetching
  const { contracts, loading: contractsLoading, error: contractsError, refresh: refreshContracts } = useClientContracts(null, clientId);
  const { offers, loading: offersLoading, error: offersError, refresh: refreshOffers } = useClientOffers(null, clientId);

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        if (!user?.id) {
          setLoading(false);
          return;
        }
        
        // Récupérer l'ID client
        const id = await getClientIdForUser(user.id, user.email || null);
        
        if (id) {
          console.log("Found client ID:", id);
          setClientId(id);
          
          // Récupérer les données complètes du client
          const client = await getClientById(id);
          if (client) {
            console.log("Retrieved client data:", client);
            setClientData(client);
          }
          
          // Sample equipment data with real-looking information
          setEquipment([
            {
              id: "EQP-2023-001",
              name: "MacBook Pro 16\"",
              status: "Actif",
              serial: "MXJL2LL/A",
              assignedTo: "Jean Dupont",
              role: "Directeur Commercial",
              assignedDate: "15/01/2023"
            },
            {
              id: "EQP-2023-002",
              name: "iPhone 14 Pro",
              status: "Actif",
              serial: "MP9G3LL/A",
              assignedTo: "Marie Lambert",
              role: "Responsable Marketing",
              assignedDate: "22/03/2023"
            },
            {
              id: "EQP-2023-003",
              name: "Dell XPS 15",
              status: "En maintenance",
              serial: "XPS159560",
              assignedTo: "Lucas Martin",
              role: "Développeur",
              assignedDate: "10/05/2023"
            },
            {
              id: "EQP-2023-004",
              name: "iPad Pro 12.9\"",
              status: "Actif",
              serial: "MP1Y3LL/A",
              assignedTo: "Sophie Mercier",
              role: "Designer UX",
              assignedDate: "05/06/2023"
            }
          ]);
        }
      } catch (error) {
        console.error("Error fetching client data:", error);
        toast.error("Erreur lors de la récupération des données");
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchClientData();
    }
  }, [user]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const getStatusBadge = (status) => {
    if (status === "Actif" || status === "active") {
      return <Badge className="bg-green-500">Actif</Badge>;
    } else if (status === "En attente de validation" || status === "pending") {
      return <Badge className="bg-yellow-500">En attente</Badge>;
    } else if (status === "En maintenance") {
      return <Badge className="bg-blue-500">En maintenance</Badge>;
    } else {
      return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };
  
  const handleRefresh = () => {
    setLoading(true);
    refreshContracts();
    refreshOffers();
    
    // Donner l'impression que le rechargement prend un peu de temps
    setTimeout(() => {
      setLoading(false);
      toast.success("Données actualisées");
    }, 1000);
  };

  return (
    <div className="w-full max-w-full p-4 md:p-6">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-full"
      >
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gradient-to-r from-primary/5 to-primary/10 p-6 rounded-xl shadow-sm">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Tableau de bord
              </h1>
              <p className="text-muted-foreground">
                Bienvenue, {clientData?.name || user?.first_name || ''} {user?.last_name || ''}
              </p>
              <p className="text-muted-foreground">
                {clientData?.company ? `Espace Client ${clientData.company}` : user?.company ? `Espace Client ${user.company}` : ''}
              </p>
              <p className="mt-4 text-muted-foreground/90 max-w-xl">
                Voici un aperçu de vos contrats et équipements. Utilisez le tableau de bord pour gérer vos ressources iTakecare.
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={loading} className="flex items-center gap-2 self-start md:self-center">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Actualiser
            </Button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-primary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Contrats
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total des contrats</p>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-green-500/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Contrats actifs
              </CardTitle>
              <Calendar className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts?.filter(c => c.status === 'active').length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Contrats en cours</p>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-blue-500/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Équipements
              </CardTitle>
              <Laptop className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{equipment.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Appareils gérés</p>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-yellow-500/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                En cours
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offers?.filter(o => o.status === 'pending' || !o.status).length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Demandes en attente</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contrats récents</CardTitle>
              <Button variant="outline" size="sm" asChild className="shadow-sm">
                <Link to="/client/contracts">Voir tous</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {contractsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : contracts.length > 0 ? (
                <div className="space-y-4">
                  {contracts.slice(0, 3).map((contract) => (
                    <div key={contract.id} className="flex items-center justify-between border-b pb-4 hover:bg-muted/20 p-2 rounded-md transition-colors">
                      <div>
                        <div className="font-medium">Contrat #{contract.id.substring(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">
                          Créé le {new Date(contract.created_at).toLocaleDateString()}
                        </div>
                        <div className="mt-1">{getStatusBadge(contract.status)}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-primary">{formatCurrency(contract.monthly_payment)}</div>
                          <div className="text-xs text-muted-foreground">par mois</div>
                        </div>
                        <Button variant="ghost" size="icon" asChild className="rounded-full">
                          <Link to={`/client/contracts/${contract.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-muted/30 rounded-lg">
                  <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">
                    {contractsError ? "Erreur lors du chargement des contrats" : "Aucun contrat trouvé"}
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-2 max-w-xs mx-auto">
                    Vos contrats apparaîtront ici une fois qu'ils seront approuvés
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Demandes en cours</CardTitle>
              <Button variant="outline" size="sm" asChild className="shadow-sm">
                <Link to="/client/requests">Voir toutes</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {offersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : offers && offers.length > 0 ? (
                <div className="space-y-4">
                  {offers.slice(0, 2).map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between pb-4 border-b hover:bg-muted/20 p-2 rounded-md transition-colors">
                      <div>
                        <div className="font-medium">Demande #{offer.id.substring(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">
                          Créée le {new Date(offer.created_at).toLocaleDateString()}
                        </div>
                        <Badge className="mt-1 bg-yellow-500">En attente de validation</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-primary">{formatCurrency(offer.monthly_payment)}</div>
                          <div className="text-xs text-muted-foreground">
                            par mois
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" asChild className="rounded-full">
                          <Link to={`/client/requests/${offer.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-muted/30 rounded-lg">
                  <Clock className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">
                    {offersError ? "Erreur lors du chargement des demandes" : "Aucune demande en cours"}
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-2 max-w-xs mx-auto">
                    Commencez par créer une demande de matériel
                  </p>
                </div>
              )}

              <div className="mt-6">
                <Button className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md" asChild>
                  <Link to="/client/new-request">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle demande
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {equipment && equipment.length > 0 && (
          <motion.div variants={itemVariants} className="mt-8">
            <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mes équipements</CardTitle>
                <Button variant="outline" size="sm" asChild className="shadow-sm">
                  <Link to="/client/equipment">Voir tous</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b">
                        <th className="text-left font-medium py-2 px-2">ID</th>
                        <th className="text-left font-medium py-2 px-2">Équipement</th>
                        <th className="text-left font-medium py-2 px-2">Statut</th>
                        <th className="text-left font-medium py-2 px-2">Assigné à</th>
                        <th className="text-left font-medium py-2 px-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.slice(0, 3).map((item) => (
                        <tr key={item.id} className="hover:bg-muted/20 group">
                          <td className="py-3 px-2 text-sm">{item.id}</td>
                          <td className="py-3 px-2 text-sm font-medium">{item.name}</td>
                          <td className="py-3 px-2">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="py-3 px-2 text-sm">
                            <div>{item.assignedTo}</div>
                            <div className="text-xs text-muted-foreground">{item.role}</div>
                          </td>
                          <td className="py-3 px-2 text-sm">{item.assignedDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ClientDashboard;
