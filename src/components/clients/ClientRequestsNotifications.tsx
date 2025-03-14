
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, XCircle, RefreshCw, Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, formatDistanceToNow } from "@/utils/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ClientRequestsNotifications = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPendingRequests = async () => {
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
          clients (
            id,
            name,
            email,
            company
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      setPendingRequests(data);
    } catch (err) {
      console.error("Erreur lors du chargement des demandes en attente:", err);
      setError("Impossible de charger les demandes en attente");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    
    // S'abonner aux nouvelles demandes en temps réel
    const channel = supabase
      .channel('admin-pending-requests')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'offers',
        filter: `status=eq.pending`,
      }, (payload) => {
        console.log('Nouvelle demande reçue:', payload);
        
        // Récupérer les données complètes
        fetchPendingRequests();
        
        // Afficher une notification
        toast.info("Nouvelle demande client reçue", {
          description: `De: ${payload.new.client_name}`,
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
      setPendingRequests(prev => prev.filter(req => req.id !== offerId));
      
      toast.success(`Demande ${newStatus === 'accepted' ? 'acceptée' : 'refusée'} avec succès`);
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut:", err);
      toast.error("Impossible de mettre à jour le statut de la demande");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Demandes à traiter
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
            <Bell className="h-5 w-5" />
            Demandes à traiter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6">
            <p className="text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchPendingRequests}>
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
            <Bell className="h-5 w-5" />
            Demandes à traiter
          </CardTitle>
          {pendingRequests.length > 0 && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">
              {pendingRequests.length} en attente
            </Badge>
          )}
        </div>
        <CardDescription>
          {pendingRequests.length > 0 
            ? "Demandes clients nécessitant votre intervention" 
            : "Aucune demande en attente de traitement"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/10 rounded-md">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium">Aucune demande en attente</p>
            <p className="text-sm text-muted-foreground mt-1">
              Toutes les demandes client ont été traitées
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-1">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex flex-col p-3 border rounded-md hover:bg-muted/10 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{request.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.clients?.company || 'Entreprise non spécifiée'} • 
                      {request.created_at ? ` Il y a ${formatDistanceToNow(new Date(request.created_at))}` : ''}
                    </p>
                  </div>
                  <Badge className="bg-yellow-500/80">En attente</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Montant</p>
                    <p className="font-medium">{formatCurrency(request.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mensualité</p>
                    <p className="font-medium text-primary">{formatCurrency(request.monthly_payment)}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    asChild
                  >
                    <Link to={`/offers/${request.id}`}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Détails
                    </Link>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-green-600 hover:bg-green-100 hover:text-green-700"
                    onClick={() => handleUpdateStatus(request.id, 'accepted')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accepter
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 text-red-600 hover:bg-red-100 hover:text-red-700"
                    onClick={() => handleUpdateStatus(request.id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Refuser
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to="/offers?status=pending">
            Voir toutes les demandes
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClientRequestsNotifications;
