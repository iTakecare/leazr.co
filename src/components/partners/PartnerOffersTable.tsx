
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  PlusCircle,
  Calendar
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";

const PartnerOffersTable = () => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchOffers = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          created_at,
          client_name,
          equipment_description,
          amount,
          monthly_payment,
          status
        `)
        .eq('user_id', user.id)
        .eq('type', 'partner_offer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Erreur lors du chargement des offres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [user]);

  const createNewOffer = () => {
    navigate('/partner/offers/create');
  };
  
  // Fonction de navigation corrigée pour utiliser le hook useNavigate
  const navigateToOfferDetail = (offerId: string) => {
    console.log("Navigating to offer details:", offerId);
    navigate(`/offers/${offerId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">En attente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejetée</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Acceptée</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Envoyée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-md border">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-medium">Mes offres</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchOffers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="default" size="sm" onClick={createNewOffer}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Nouvelle offre
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Chargement des offres...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">Aucune offre trouvée.</p>
          <Button variant="outline" onClick={createNewOffer} className="mt-4">
            <PlusCircle className="h-4 w-4 mr-2" />
            Créer ma première offre
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Matériel</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{format(new Date(offer.created_at), 'dd/MM/yyyy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>{offer.client_name}</TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {offer.equipment_description}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(offer.monthly_payment)}
                  </TableCell>
                  <TableCell>{getStatusBadge(offer.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigateToOfferDetail(offer.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Voir détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default PartnerOffersTable;
