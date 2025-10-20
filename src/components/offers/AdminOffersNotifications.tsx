
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, XCircle, RefreshCw, Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, formatDistanceToNow } from "@/utils/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminOffersNotifications = () => {
  const [pendingOffers, setPendingOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPendingOffers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          client_name,
          client_email,
          client_id,
          amount,
          monthly_payment,
          equipment_description,
          status,
          workflow_status,
          created_at,
          type,
          clients (
            id,
            name,
            email,
            company
          )
        `)
        .eq('status', 'pending')
        .eq('type', 'admin_offer')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      setPendingOffers(data);
    } catch (err) {
      console.error("Erreur lors du chargement des offres en attente:", err);
      setError("Impossible de charger les offres en attente");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOffers();
    
    // S'abonner aux nouvelles offres en temps réel
    const channel = supabase
      .channel('admin-pending-offers')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'offers',
        filter: `status=eq.pending AND type=eq.admin_offer`,
      }, (payload) => {
        console.log('Nouvelle offre administrateur créée:', payload);
        
        // Récupérer les données complètes
        fetchPendingOffers();
        
        // Afficher une notification
        toast.info("Nouvelle offre créée", {
          description: `Pour: ${payload.new.client_name}`,
          action: {
            label: "Voir",
            onClick: () => window.location.href = `/offers/${payload.new.id}`
          }
        });
      })
      .subscribe();

    // Nettoyage lors du démontage
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (offerId, newStatus) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ status: newStatus })
        .eq('id', offerId);
      
      if (error) throw error;
      
      // Mettre à jour localement
      setPendingOffers(prev => prev.filter(offer => offer.id !== offerId));
      
      toast.success(`Offre ${newStatus === 'accepted' ? 'acceptée' : 'refusée'} avec succès`);
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut:", err);
      toast.error("Impossible de mettre à jour le statut de l'offre");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Offres en attente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Offres en attente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6">
            <p className="text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchPendingOffers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Offres en attente
          </CardTitle>
          {pendingOffers.length > 0 && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
              {pendingOffers.length} en attente
            </Badge>
          )}
        </div>
        <CardDescription>
          {pendingOffers.length > 0 
            ? "Offres administrateur en attente d'action" 
            : "Aucune offre en attente de traitement"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/10 rounded-md">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium">Aucune offre en attente</p>
            <p className="text-sm text-muted-foreground mt-1">
              Toutes les offres ont été traitées
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-1">
            {pendingOffers.map((offer) => (
              <div key={offer.id} className="flex flex-col p-3 border rounded-md hover:bg-muted/10 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{offer.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {offer.clients?.company || 'Entreprise non spécifiée'} • 
                      {offer.created_at ? ` Il y a ${formatDistanceToNow(new Date(offer.created_at))}` : ''}
                    </p>
                  </div>
                  <Badge className="bg-blue-500/80">En attente</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Montant</p>
                    <p className="font-medium">{formatCurrency(offer.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mensualité</p>
                    <p className="font-medium text-primary">{formatCurrency(offer.monthly_payment)}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    asChild
                  >
                    <Link to={`/offers/${offer.id}`}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Détails
                    </Link>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-green-600 hover:bg-green-100 hover:text-green-700"
                    onClick={() => handleUpdateStatus(offer.id, 'accepted')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approuver
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 text-red-600 hover:bg-red-100 hover:text-red-700"
                    onClick={() => handleUpdateStatus(offer.id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to="/offers?status=pending&type=admin_offer">
            Voir toutes les offres
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AdminOffersNotifications;
