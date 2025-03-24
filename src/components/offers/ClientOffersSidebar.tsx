
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ClientOffer = {
  id: string;
  client_name: string;
  client_email?: string;
  monthly_payment: number;
  equipment_description?: string;
  created_at: string;
  workflow_status: string;
  signature_data?: string;
};

interface ClientOffersSidebarProps {
  currentOfferId: string;
  clientEmail?: string;
}

const ClientOffersSidebar: React.FC<ClientOffersSidebarProps> = ({ 
  currentOfferId,
  clientEmail
}) => {
  const [offers, setOffers] = useState<ClientOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClientOffers = async () => {
      if (!clientEmail) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('offers')
          .select('id, client_name, client_email, monthly_payment, equipment_description, created_at, workflow_status, signature_data')
          .eq('client_email', clientEmail)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching client offers:", error);
          return;
        }

        setOffers(data || []);
      } catch (err) {
        console.error("Error in client offers fetch:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClientOffers();
  }, [clientEmail]);

  const getStatusIcon = (status: string, hasSigned: boolean) => {
    if (hasSigned || status === 'approved') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (status === 'sent') {
      return <Clock className="h-4 w-4 text-amber-500" />;
    } else if (status === 'draft') {
      return <FileText className="h-4 w-4 text-slate-400" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string, hasSigned: boolean) => {
    if (hasSigned || status === 'approved') {
      return <Badge className="bg-green-100 text-green-800 text-xs">Signée</Badge>;
    } else if (status === 'sent') {
      return <Badge className="bg-amber-100 text-amber-800 text-xs">En attente</Badge>;
    } else if (status === 'draft') {
      return <Badge className="bg-slate-100 text-slate-800 text-xs">Brouillon</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800 text-xs">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
    } catch {
      return "Date incorrecte";
    }
  };

  const handleOfferClick = (offerId: string) => {
    if (offerId === currentOfferId) return;
    navigate(`/client/sign-offer/${offerId}`);
  };

  if (loading) {
    return (
      <div className="w-64 h-full border-r bg-gray-50 p-4 flex flex-col">
        <h3 className="font-medium mb-4">Vos offres</h3>
        <Skeleton className="h-16 mb-2 rounded-md" />
        <Skeleton className="h-16 mb-2 rounded-md" />
        <Skeleton className="h-16 rounded-md" />
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <div className="w-64 h-full border-r bg-gray-50 p-4 flex flex-col">
        <h3 className="font-medium mb-4">Vos offres</h3>
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
          <FileText className="h-8 w-8 mb-2 text-gray-400" />
          <p className="text-sm">Aucune autre offre disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 h-full border-r bg-gray-50 p-4 flex flex-col overflow-auto">
      <h3 className="font-medium mb-4">Vos offres</h3>
      <div className="space-y-3">
        {offers.map((offer) => (
          <div 
            key={offer.id}
            className={`p-3 rounded-md cursor-pointer transition-colors ${
              offer.id === currentOfferId 
                ? 'bg-blue-50 border border-blue-200' 
                : 'bg-white border hover:bg-gray-50'
            }`}
            onClick={() => handleOfferClick(offer.id)}
          >
            <div className="flex justify-between items-start mb-1">
              <div className="text-sm font-medium truncate max-w-[70%]">
                {formatCurrency(offer.monthly_payment)}/mois
              </div>
              {getStatusBadge(offer.workflow_status, !!offer.signature_data)}
            </div>
            
            <div className="flex items-center text-xs text-gray-500">
              <span className="mr-1">{formatDate(offer.created_at)}</span>
              {getStatusIcon(offer.workflow_status, !!offer.signature_data)}
            </div>
            
            {offer.equipment_description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                {offer.equipment_description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientOffersSidebar;
