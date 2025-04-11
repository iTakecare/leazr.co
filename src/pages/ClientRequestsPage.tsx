import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useClientOffers, ClientOffer } from "@/hooks/useClientOffers";
import ClientsError from "@/components/clients/ClientsError";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { Loader2, RefreshCw, FileText, Clock, CalendarRange, X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ClientRequestsPage = () => {
  const { user } = useAuth();
  const { offers, loading, error, refresh } = useClientOffers();

  console.log("ClientRequestsPage - user:", user);
  console.log("ClientRequestsPage - offers:", offers);
  console.log("ClientRequestsPage - error:", error);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  // Écouter les notifications de nouvelles demandes en temps réel
  useEffect(() => {
    if (!user?.id || !user?.client_id) {
      console.log("Aucun utilisateur ou client_id trouvé pour la subscription aux changements");
      return;
    }

    console.log("Mise en place de la subscription aux changements des offres pour client_id:", user.client_id);

    // S'abonner aux changements de statut des demandes
    const channel = supabase
      .channel('offers-status-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'offers',
        filter: `client_id=eq.${user.client_id}`,
      }, (payload) => {
        console.log('Notification de mise à jour de statut:', payload);
        
        // Récupérer les dernières données
        refresh();
        
        // Afficher une notification appropriée
        if (payload.new.status === 'accepted') {
          toast.success("Votre demande a été acceptée!");
        } else if (payload.new.status === 'rejected') {
          toast.error("Votre demande a été refusée.");
        } else {
          toast.info("Le statut de votre demande a été mis à jour.");
        }
      })
      .subscribe((status) => {
        console.log("Statut de subscription aux changements:", status);
      });

    // Nettoyage lors du démontage
    return () => {
      console.log("Nettoyage de la subscription aux changements");
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.client_id, refresh]);

  if (loading) {
    return (
      <div className="w-full p-8">
        <h1 className="text-3xl font-bold mb-6">Mes Demandes</h1>
        <div className="flex flex-col justify-center items-center min-h-[300px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Chargement des demandes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-8">
        <h1 className="text-3xl font-bold mb-6">Mes Demandes</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
            <h3 className="text-xl font-medium text-red-700 mb-2">Impossible de charger vos offres</h3>
            <p className="text-red-600 mb-4 text-center max-w-md">{error}</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={refresh} 
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
              {!user?.client_id && (
                <Card className="p-3 bg-amber-50 border-amber-200 mt-4">
                  <div className="flex gap-2 items-start">
                    <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-800">
                        Aucun compte client n'est associé à votre profil. Veuillez contacter le support.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    if (status === 'accepted') {
      return <Badge className="bg-green-500">Acceptée</Badge>;
    } else if (status === 'rejected') {
      return <Badge className="bg-red-500">Refusée</Badge>;
    } else {
      return <Badge className="bg-yellow-500">En attente</Badge>;
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'accepted') {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else if (status === 'rejected') {
      return <X className="h-6 w-6 text-red-500" />;
    } else {
      return <Clock className="h-6 w-6 text-yellow-500" />;
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full p-4 md:p-6"
    >
      <div className="flex justify-between items-center mb-6 bg-muted/30 p-4 rounded-lg">
        <div>
          <h1 className="text-3xl font-bold">Mes Demandes</h1>
          <p className="text-muted-foreground">Suivez l'état de vos demandes d'équipement</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={refresh} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>
      
      {(!offers || offers.length === 0) ? (
        <Card className="border-none bg-gradient-to-br from-background to-muted/20 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center max-w-md">
              <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-medium">Aucune demande trouvée</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                Vous n'avez pas encore de demandes actives.
              </p>
              {!user?.client_id && (
                <Card className="p-3 bg-amber-50 border-amber-200 mt-4">
                  <div className="flex gap-2 items-start">
                    <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-800">
                        Aucun compte client n'est associé à votre profil. 
                        Vos offres ne peuvent pas être affichées.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" variants={containerVariants}>
          {offers.map((offer: ClientOffer) => (
            <motion.div key={offer.id} variants={itemVariants}>
              <Card className="h-full shadow-md hover:shadow-lg transition-all overflow-hidden border-t-4 border-t-yellow-500/60">
                <CardHeader className="bg-gradient-to-r from-muted/30 to-transparent flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span>Demande #{offer.id.substring(0, 8)}</span>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <CalendarRange className="h-3.5 w-3.5" />
                        <span>{new Date(offer.created_at).toLocaleDateString('fr-FR')}</span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(offer.status)}
                  </div>
                  
                  <div className="flex items-center bg-muted/20 p-3 rounded-md -mx-6">
                    <div className="mr-3">
                      {getStatusIcon(offer.status)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {offer.status === 'accepted' 
                          ? "Demande acceptée" 
                          : offer.status === 'rejected' 
                            ? "Demande refusée" 
                            : "En attente de validation"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {offer.status === 'accepted' 
                          ? "Votre demande a été approuvée" 
                          : offer.status === 'rejected' 
                            ? "Votre demande n'a pas été approuvée" 
                            : "Votre demande est en cours d'examen"}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-md">
                      <div>
                        <p className="text-xs text-muted-foreground">Montant total</p>
                        <p className="font-medium">{formatCurrency(offer.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Loyer mensuel</p>
                        <p className="font-medium text-primary">{formatCurrency(offer.monthly_payment)}/mois</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Équipement</p>
                      <p className="text-sm bg-muted/10 p-2 rounded-md">
                        {offer.equipment_description
                          ? offer.equipment_description.length > 100
                            ? `${offer.equipment_description.substring(0, 100)}...`
                            : offer.equipment_description
                          : "Description non disponible"}
                      </p>
                    </div>
                    
                    <div className="pt-4 mt-auto">
                      <Button size="sm" className="w-full shadow-sm">
                        Voir les détails
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ClientRequestsPage;
