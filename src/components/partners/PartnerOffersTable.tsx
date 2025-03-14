
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
  Eye, 
  RefreshCw, 
  FileDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">En attente</Badge>;
    case 'accepted':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Validée</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Refusée</Badge>;
    case 'info_requested':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Informations demandées</Badge>;
    case 'leaser_review':
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Évaluation leaser</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const PartnerOffersTable = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          client_email,
          equipment_description,
          amount,
          monthly_payment,
          status,
          workflow_status,
          commission
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

  const handleViewOffer = (id: string) => {
    navigate(`/partner/offers/${id}`);
  };

  const handleDownloadPdf = async (id: string) => {
    // This would be implemented to download the offer PDF
    toast.info("Téléchargement du PDF...");
  };

  return (
    <div className="bg-white rounded-md border">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-medium">Mes offres</h3>
        <Button variant="outline" size="sm" onClick={fetchOffers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Chargement des offres...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">Aucune offre trouvée.</p>
          <Button 
            className="mt-4" 
            onClick={() => navigate("/partner/create-offer")}
          >
            Créer votre première offre
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
                <TableHead className="text-right">Mensualité</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(offer.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {offer.client_name}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {offer.equipment_description?.substring(0, 30)}
                    {offer.equipment_description?.length > 30 ? '...' : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(offer.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(offer.monthly_payment)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(offer.commission)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(offer.workflow_status || offer.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleViewOffer(offer.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {offer.status === 'accepted' && (
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(offer.id)}>
                          <FileDown className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
