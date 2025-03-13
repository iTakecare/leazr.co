
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import {
  FileText,
  LayoutDashboard,
  Laptop,
  Clock,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const ClientDashboard = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientData = async () => {
      setLoading(true);
      try {
        // Get client ID from email
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('email', user?.email)
          .single();
        
        if (clientData) {
          const clientId = clientData.id;
          
          // Fetch contracts
          const { data: contractsData } = await supabase
            .from('contracts')
            .select('*')
            .eq('client_id', clientId);
            
          // Fetch offers/requests
          const { data: offersData } = await supabase
            .from('offers')
            .select('*')
            .eq('client_id', clientId);
          
          // In a real app, we'd fetch equipment data here
          // This is a placeholder for the mock equipment data
          
          setContracts(contractsData || []);
          setOffers(offersData || []);
          setEquipment(Array(6).fill({
            id: Math.random().toString(),
            name: "Ordinateur fixe",
            status: "Actif",
            serial: "EZFDSDSFG",
            assignedTo: "Eric Erac",
            role: "CMO",
            assignedDate: "09/03/2025"
          }));
        }
      } catch (error) {
        console.error("Error fetching client data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
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
    if (status === "Actif" || status === "Actif") {
      return <Badge className="bg-green-500">Actif</Badge>;
    } else if (status === "En attente de validation") {
      return <Badge className="bg-yellow-500">En attente de validation</Badge>;
    } else {
      return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  return (
    <div className="w-full max-w-full">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-full"
      >
        <motion.div variants={itemVariants} className="mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground">
              Bienvenue, {user?.first_name || ''} {user?.last_name || ''}
            </p>
            <p className="text-muted-foreground">
              {user?.company ? `Espace Client ${user.company}` : ''}
            </p>
            <p className="mt-4">
              Voici un aperçu de vos contrats et équipements. Utilisez le tableau de bord pour gérer vos ressources iTakecare.
            </p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Contrats
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts.length || 2}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Contrats actifs
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts.filter(c => c.status === 'active').length || 2}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Équipements
              </CardTitle>
              <Laptop className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{equipment.length || 6}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                En cours
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offers.filter(o => o.status === 'pending').length || 1}</div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants} className="mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contrats récents</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/client/contracts">Voir tous</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">Chargement...</div>
              ) : contracts.length > 0 ? (
                <div className="space-y-4">
                  {contracts.slice(0, 3).map((contract) => (
                    <div key={contract.id} className="flex items-center justify-between border-b pb-4">
                      <div>
                        <div className="font-medium">Contrat #{contract.id.substring(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">
                          Créé le {new Date(contract.created_at).toLocaleDateString()}
                        </div>
                        {getStatusBadge(contract.status)}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-medium text-right">
                          {formatCurrency(contract.monthly_payment)}/mois
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/client/contracts/${contract.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )) || (
                    <>
                      <div className="flex items-center justify-between border-b pb-4">
                        <div>
                          <div className="font-medium">Contrat #fcdeaf2d</div>
                          <div className="text-sm text-muted-foreground">
                            Créé le 09/03/2025
                          </div>
                          <Badge className="bg-green-500">Actif</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-medium text-right">
                            73,80 €/mois
                          </div>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to="/client/contracts/1">
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pb-4">
                        <div>
                          <div className="font-medium">Contrat #6987b377</div>
                          <div className="text-sm text-muted-foreground">
                            Créé le 09/03/2025
                          </div>
                          <Badge className="bg-green-500">Actif</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-medium text-right">
                            80,85 €/mois
                          </div>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to="/client/contracts/2">
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Aucun contrat trouvé
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Demandes en cours</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/client/requests">Voir toutes</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">Chargement...</div>
              ) : offers.length > 0 ? (
                <div className="space-y-4">
                  {offers.map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between pb-4 border-b">
                      <div>
                        <div className="font-medium">Demande #{offer.id.substring(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">
                          Créée le {new Date(offer.created_at).toLocaleDateString()}
                        </div>
                        <Badge className="bg-yellow-500">En attente de validation</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(offer.monthly_payment)}/mois</div>
                          <div className="text-sm text-muted-foreground">
                            1 équipement(s)
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/client/requests/${offer.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )) || (
                    <div className="flex items-center justify-between pb-4">
                      <div>
                        <div className="font-medium">Demande #303391c9</div>
                        <div className="text-sm text-muted-foreground">
                          Créée le 10/03/2025
                        </div>
                        <Badge className="bg-yellow-500">En attente de validation</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">23,10 €/mois</div>
                          <div className="text-sm text-muted-foreground">
                            1 équipement(s)
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to="/client/requests/1">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Aucune demande en cours
                </div>
              )}

              <div className="mt-4">
                <Button className="w-full" asChild>
                  <Link to="/client/new-request">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle demande
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ClientDashboard;
