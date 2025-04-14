
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, FileText, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { formatDistanceToNow, formatCurrency } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface RequestItem {
  id: string;
  client_name: string;
  monthly_payment: number;
  equipment_description: string;
  status: string;
  workflow_status: string;
  created_at: string;
}

const RequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [localRequests, setLocalRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Charger les demandes
  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Récupérer les demandes depuis le localStorage en attendant la connexion à l'API
      const storedRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
      setLocalRequests(storedRequests);
      
      // Tenter de récupérer les demandes depuis la base de données
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('type', 'client_request')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setRequests(data || []);
      } catch (dbError) {
        console.error('Erreur lors de la récupération des demandes depuis la base de données:', dbError);
        // En cas d'erreur, on garde les données du localStorage
      }
    } catch (err) {
      console.error('Erreur lors du chargement des demandes:', err);
      setError('Impossible de charger vos demandes. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchRequests();
  }, []);
  
  // Fonction pour déterminer la couleur du badge en fonction du statut
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'signed':
      case 'accepted':
        return "bg-green-100 text-green-800";
      case 'draft':
      case 'pending':
        return "bg-yellow-100 text-yellow-800";
      case 'rejected':
        return "bg-red-100 text-red-800";
      case 'sent':
      case 'client_waiting':
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Fonction pour traduire le statut
  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'En attente',
      'accepted': 'Acceptée',
      'rejected': 'Refusée',
      'draft': 'Brouillon',
      'sent': 'Envoyée',
      'client_waiting': 'En attente de réponse',
      'signed': 'Signée',
      'archived': 'Archivée',
      'requested_info': 'Informations demandées'
    };
    
    return statusMap[status] || status;
  };
  
  // Fonction pour formatter la description de l'équipement
  const formatEquipmentDescription = (description: string) => {
    try {
      const equipment = JSON.parse(description);
      if (Array.isArray(equipment)) {
        return equipment.map(item => item.name).join(', ');
      }
      return description;
    } catch (err) {
      return description;
    }
  };
  
  const allRequests = [...requests, ...localRequests];
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mes demandes</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchRequests}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          
          <Button asChild>
            <Link to="/client/requests/new">
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle demande
            </Link>
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : allRequests.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Aucune demande</h3>
          <p className="text-gray-500 mb-6">
            Vous n'avez pas encore effectué de demande. Commencez par ajouter des produits à votre panier.
          </p>
          <Button asChild>
            <Link to="/catalogue">Voir le catalogue</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allRequests.map((request) => (
            <div key={request.id} className="bg-white p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-lg line-clamp-1">{request.client_name}</h3>
                <Badge className={getStatusBadgeColor(request.workflow_status || request.status)}>
                  {translateStatus(request.workflow_status || request.status)}
                </Badge>
              </div>
              
              <div className="mb-3">
                <h4 className="text-sm text-gray-500 mb-1">Équipement</h4>
                <p className="text-sm line-clamp-2">
                  {formatEquipmentDescription(request.equipment_description)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <h4 className="text-sm text-gray-500">Mensualité</h4>
                  <p className="font-medium">{formatCurrency(request.monthly_payment)}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500">Date</h4>
                  <p className="text-sm">
                    {request.created_at 
                      ? formatDistanceToNow(new Date(request.created_at)) 
                      : "Récemment"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center mt-4">
                {request.workflow_status === 'sent' || request.status === 'sent' ? (
                  <div className="flex items-center text-blue-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">Demande envoyée</span>
                  </div>
                ) : (
                  <div className="flex items-center text-yellow-600">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="text-sm">En attente de traitement</span>
                  </div>
                )}
                
                <Button 
                  variant="link" 
                  size="sm" 
                  className="ml-auto"
                  asChild
                >
                  <Link to={`/client/requests/${request.id}`}>
                    Détails
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestsPage;
