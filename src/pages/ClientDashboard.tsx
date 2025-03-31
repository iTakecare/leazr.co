
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
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getClientIdForUser } from "@/utils/clientUserAssociation";
import { useClientOffers } from "@/hooks/useClientOffers";
import { useClientContracts } from "@/hooks/useClientContracts";

const ClientDashboard = () => {
  const { user } = useAuth();
  const { contracts, loading: contractsLoading, error: contractsError, refresh: refreshContracts } = useClientContracts();
  const { offers, loading: offersLoading, error: offersError, refresh: refreshOffers } = useClientOffers();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState(null);

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
    
    setTimeout(() => {
      setLoading(false);
      toast.success("Données actualisées");
    }, 1000);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white border-b p-4 md:px-8 md:py-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground">
              {user?.email ? `${user.email}` : ''}
              {user?.company ? ` - ${user.company}` : ''}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Bienvenue dans votre espace iTakecare. Gérez vos contrats et équipements.
            </p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleRefresh}
            className="flex items-center gap-2 self-end"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 md:p-8">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <FileText className="h-4 w-4 mr-2" /> Contrats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Contrats en cours</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <FileText className="h-4 w-4 mr-2 text-green-500" /> Contrats actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts?.filter(c => c.status === 'active').length || 0}</div>
              <p className="text-xs text-muted-foreground">Contrats actifs</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Laptop className="h-4 w-4 mr-2 text-blue-500" /> Équipements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{equipment.length || 0}</div>
              <p className="text-xs text-muted-foreground">Appareils gérés</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Clock className="h-4 w-4 mr-2 text-yellow-500" /> En cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offers?.filter(o => o.status === 'pending' || !o.status).length || 0}</div>
              <p className="text-xs text-muted-foreground">Demandes en attente</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Contracts section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Contrats</h2>
            <Link to="/client/contracts" className="text-sm text-primary hover:underline">
              Voir tous
            </Link>
          </div>
          
          {contractsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : contracts && contracts.length > 0 ? (
            <div className="grid gap-4">
              {contracts.slice(0, 3).map((contract) => (
                <div key={contract.id} className="bg-white p-4 rounded-lg border shadow-sm hover:shadow transition-shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Contrat #{contract.id.substring(0, 8)}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(contract.created_at).toLocaleDateString()}
                      </div>
                      {getStatusBadge(contract.status)}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-primary">{formatCurrency(contract.monthly_payment)}</div>
                        <div className="text-xs text-muted-foreground">par mois</div>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/client/contracts/${contract.id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed">
              <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Aucun contrat trouvé
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2 max-w-xs mx-auto">
                Vos contrats apparaîtront ici une fois qu'ils seront approuvés
              </p>
            </div>
          )}
        </div>
        
        {/* Requests section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Demandes</h2>
            <Link to="/client/requests" className="text-sm text-primary hover:underline">
              Voir toutes
            </Link>
          </div>
          
          {offersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : offers && offers.length > 0 ? (
            <div className="grid gap-4">
              {offers.slice(0, 2).map((offer) => (
                <div key={offer.id} className="bg-white p-4 rounded-lg border shadow-sm hover:shadow transition-shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Demande #{offer.id.substring(0, 8)}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(offer.created_at).toLocaleDateString()}
                      </div>
                      <Badge className="mt-1 bg-yellow-500">En attente</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-primary">{formatCurrency(offer.monthly_payment)}</div>
                        <div className="text-xs text-muted-foreground">par mois</div>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/client/requests/${offer.id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed">
              <Clock className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Aucune demande en cours
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2 max-w-xs mx-auto">
                Commencez par créer une demande de matériel
              </p>
            </div>
          )}
          
          <div className="mt-6">
            <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
              <Link to="/client/new-request">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle demande
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
