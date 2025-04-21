import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, XCircle, RefreshCw, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, formatDistanceToNow } from "@/utils/formatters";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StoredRequest {
  id: string;
  client_name: string;
  client_email: string;
  client_company: string;
  equipment_description: string;
  amount: number;
  monthly_payment: number;
  quantity?: number;
  duration?: number;
  status: string;
  workflow_status: string;
  type: string;
  created_at: string;
  message?: string;
}

const ClientRequestsNotifications = () => {
  const [pendingRequests, setPendingRequests] = useState<StoredRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPendingRequests = () => {
    setLoading(true);
    setError(null);
    
    try {
      const storedRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
      setPendingRequests(storedRequests);
      console.log("Local client requests loaded:", storedRequests);
    } catch (err: any) {
      console.error("Erreur lors du chargement des demandes en attente:", err);
      setError(err.message || "Impossible de charger les demandes en attente");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    
    const checkInterval = setInterval(fetchPendingRequests, 30000);
    return () => clearInterval(checkInterval);
  }, []);

  const handleUpdateStatus = (requestId: string, newStatus: string) => {
    try {
      const updatedRequests = pendingRequests.filter(req => req.id !== requestId);
      localStorage.setItem('pendingRequests', JSON.stringify(updatedRequests));
      
      setPendingRequests(updatedRequests);
      
      toast.success(`Demande ${newStatus === 'accepted' ? 'acceptée' : 'refusée'} avec succès`);
    } catch (err: any) {
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
            Demandes clients à traiter
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
            Demandes clients à traiter
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
            Demandes clients à traiter
          </CardTitle>
          {pendingRequests.length > 0 && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">
              {pendingRequests.length} en attente
            </Badge>
          )}
        </div>
        <CardDescription>
          {pendingRequests.length > 0 
            ? "Mode hors-ligne: Demandes clients stockées localement" 
            : "Aucune demande stockée localement"}
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
                      {request.client_company || 'Entreprise non spécifiée'} • 
                      {request.created_at ? ` Il y a ${formatDistanceToNow(new Date(request.created_at))}` : ''}
                    </p>
                  </div>
                  <Badge className="bg-blue-500/80 text-white">Mode hors-ligne</Badge>
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

                <div className="mb-2">
                  <p className="text-xs text-muted-foreground mb-1">Équipement</p>
                  <p className="text-sm line-clamp-2">{request.equipment_description}</p>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                  >
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Stockée localement
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-red-600 hover:bg-red-100 hover:text-red-700"
                    onClick={() => handleUpdateStatus(request.id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <div className="w-full text-center text-sm text-muted-foreground p-1 rounded bg-yellow-50">
          Mode hors-ligne: Les demandes sont stockées localement en raison des problèmes d'API
        </div>
      </CardFooter>
    </Card>
  );
};

export default ClientRequestsNotifications;
