
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, FileText, Clock, Download } from 'lucide-react';
import { formatDistanceToNow, formatCurrency, formatDate } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RequestDetail {
  id: string;
  client_name: string;
  client_email: string;
  client_company: string;
  monthly_payment: number;
  amount: number;
  equipment_description: string;
  status: string;
  workflow_status: string;
  created_at: string;
  remarks?: string;
}

const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Charger les détails de la demande
  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Vérifier d'abord dans localStorage pour les demandes en attente
        const storedRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
        const localRequest = storedRequests.find((req: any) => req.id === id);
        
        if (localRequest) {
          setRequest(localRequest);
          setLoading(false);
          return;
        }
        
        // Si pas trouvé localement, chercher dans la base de données
        try {
          const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          
          if (data) {
            setRequest(data);
          } else {
            setError('Demande non trouvée');
          }
        } catch (dbError) {
          console.error('Erreur lors de la récupération de la demande:', dbError);
          setError('Impossible de récupérer les détails de la demande');
        }
      } catch (err) {
        console.error('Erreur lors du chargement des détails de la demande:', err);
        setError('Une erreur est survenue lors du chargement des détails');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRequestDetails();
  }, [id]);
  
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
  
  // Fonction pour formater l'équipement
  const formatEquipment = (description: string) => {
    try {
      const equipment = JSON.parse(description);
      
      if (Array.isArray(equipment)) {
        return (
          <div className="space-y-4">
            {equipment.map((item, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-16 h-16 object-contain bg-white rounded border" 
                    />
                  )}
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    {item.brand && <p className="text-sm text-gray-500">{item.brand}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                  <div>
                    <span className="text-gray-500">Quantité:</span> {item.quantity}
                  </div>
                  <div>
                    <span className="text-gray-500">Durée:</span> {item.duration} mois
                  </div>
                  <div>
                    <span className="text-gray-500">Prix unitaire:</span> {formatCurrency(item.monthly_price)}
                  </div>
                  <div>
                    <span className="text-gray-500">Total:</span> {formatCurrency(item.monthly_price * item.quantity)}
                  </div>
                </div>
                
                {item.options && Object.keys(item.options).length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium mb-1">Options:</h5>
                    <ul className="text-sm text-gray-600">
                      {Object.entries(item.options).map(([key, value]) => (
                        <li key={key}>
                          {key}: {value as string}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }
      
      return <pre className="whitespace-pre-wrap text-sm">{description}</pre>;
    } catch (err) {
      return <pre className="whitespace-pre-wrap text-sm">{description}</pre>;
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (error || !request) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Détails de la demande</h1>
          <Button variant="outline" asChild>
            <Link to="/client/requests">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux demandes
            </Link>
          </Button>
        </div>
        
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error || "Demande non trouvée"}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Détails de la demande</h1>
        <Button variant="outline" asChild>
          <Link to="/client/requests">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux demandes
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">{request.client_name}</h2>
                <p className="text-gray-500">{request.client_company}</p>
              </div>
              <Badge className={getStatusBadgeColor(request.workflow_status || request.status)}>
                {translateStatus(request.workflow_status || request.status)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Mensualité</h3>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(request.monthly_payment)}</p>
                <p className="text-xs text-gray-500">pour 36 mois</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Montant total financé</h3>
                <p className="text-lg font-medium">{formatCurrency(request.amount)}</p>
              </div>
            </div>
            
            <div className="border-t pt-4 mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Détails de contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p>{request.client_email || "Non spécifié"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Entreprise</p>
                  <p>{request.client_company || "Non spécifié"}</p>
                </div>
              </div>
            </div>
            
            {request.remarks && (
              <div className="border-t pt-4 mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Message</h3>
                <p className="bg-gray-50 p-3 rounded-md text-sm">{request.remarks}</p>
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium mb-4">Équipement demandé</h3>
            {formatEquipment(request.equipment_description)}
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm sticky top-4">
            <h3 className="text-lg font-medium mb-4">Statut de la demande</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-700 h-10 w-10 rounded-full flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Demande créée</p>
                  <p className="text-sm text-gray-500">
                    {request.created_at 
                      ? formatDate(new Date(request.created_at)) 
                      : "Date inconnue"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 text-yellow-700 h-10 w-10 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">
                    {request.workflow_status === 'sent' || request.status === 'sent' 
                      ? "En attente de traitement" 
                      : "En cours de traitement"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Notre équipe analyse votre demande
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t my-6"></div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Vous recevrez un email lorsque votre demande aura été traitée par notre équipe. Vous pouvez également consulter le statut de votre demande à tout moment sur cette page.
              </p>
              
              <Button variant="outline" className="w-full" asChild>
                <Link to="/catalogue">
                  Retourner au catalogue
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailPage;
