import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getOfferById, getWorkflowLogs, getOfferNotes } from "@/services/offerService";
import { formatCurrency } from "@/utils/formatters";
import { format, differenceInMonths } from "date-fns";
import { fr } from "date-fns/locale";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { sendOfferReadyEmail } from "@/services/emailService";
import { hasCommission } from "@/utils/offerTypeTranslator";
import { TooltipProvider } from "@/components/ui/tooltip";
import EquipmentDisplay from "@/components/offers/EquipmentDisplay";
import { formatEquipmentDisplay } from "@/utils/equipmentFormatter";
import { logUserProfileDiagnostics } from "@/utils/userProfileDiagnostics";

// Import des nouveaux composants modulaires
import AdminOfferHeader from "@/components/offers/detail/AdminOfferHeader";
import AdminFinancialCards from "@/components/offers/detail/AdminFinancialCards";
import AdminActionButtons from "@/components/offers/detail/AdminActionButtons";
import AdminWorkflowTimeline from "@/components/offers/detail/AdminWorkflowTimeline";
import AdminOfferNotes from "@/components/offers/detail/AdminOfferNotes";
import ClientInfoCard from "@/components/offers/detail/ClientInfoCard";
import EquipmentInfoCard from "@/components/offers/detail/EquipmentInfoCard";
import RequestInfoModal from "@/components/offers/RequestInfoModal";
import OfferStatusBadge from "@/components/offers/OfferStatusBadge";
import OfferHistoryTimeline from "@/components/offers/OfferHistoryTimeline";
import OfferCompleteHistory from "@/components/offers/OfferCompleteHistory";
import OfferDocuments from "@/components/offers/OfferDocuments";

const AdminOfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [offerNotes, setOfferNotes] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    const fetchOfferDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const offerData = await getOfferById(id);

        if (!offerData) {
          setError("Offre non trouvée");
          toast.error("Offre non trouvée");
          return;
        }

        setOffer(offerData);
        fetchWorkflowLogs(id);
        fetchOfferNotes(id);
      } catch (err) {
        console.error("Erreur lors du chargement de l'offre:", err);
        setError("Impossible de charger les détails de l'offre");
        toast.error("Erreur lors du chargement des détails de l'offre");
      } finally {
        setLoading(false);
      }
    };

    fetchOfferDetails();
  }, [id]);

  const fetchWorkflowLogs = async (offerId: string) => {
    try {
      setLogsLoading(true);
      const logs = await getWorkflowLogs(offerId);
      setWorkflowLogs(logs);
    } catch (error) {
      console.error("Erreur lors du chargement des logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchOfferNotes = async (offerId: string) => {
    try {
      setNotesLoading(true);
      const notes = await getOfferNotes(offerId);
      setOfferNotes(notes);
    } catch (error) {
      console.error("Erreur lors du chargement des notes:", error);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleNoteAdded = () => {
    if (id) {
      fetchOfferNotes(id);
    }
  };

  const handleSendEmail = async () => {
    if (!offer || !offer.id) {
      toast.error("Impossible d'envoyer l'email");
      return;
    }

    try {
      setSendingEmail(true);

      if (offer.workflow_status === 'draft') {
        const { error } = await supabase
          .from('offers')
          .update({ workflow_status: 'sent' })
          .eq('id', id);

        if (error) throw error;

        setOffer({ ...offer, workflow_status: 'sent' });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success("Email envoyé au client avec succès");
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'email:", err);
      toast.error("Impossible d'envoyer l'email");
    } finally {
      setSendingEmail(false);
    }
  };

  const isAdmin = useCallback(() => {
    return user?.role === 'admin';
  }, [user]);

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement des détails de l'offre...</span>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erreur</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate("/admin/offers")}>
              Retour aux offres
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (!offer) {
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Offre introuvable</h2>
            <p className="text-gray-600 mb-4">Cette offre n'existe pas ou a été supprimée.</p>
            <Button onClick={() => navigate("/admin/offers")}>
              Retour aux offres
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  const shouldShowCommission = hasCommission(offer.type);
  const calculatedMargin = offer?.amount && offer?.financed_amount
    ? offer.amount - offer.financed_amount
    : 0;
  const marginPercentage = offer?.amount && offer?.financed_amount && offer?.amount > 0
    ? parseFloat(((calculatedMargin / offer.financed_amount) * 100).toFixed(2))
    : 0;

  return (
    <PageTransition>
      <Container>
        <TooltipProvider>
          <div className="p-4 md:p-6 space-y-6">
            {/* En-tête de l'offre */}
            <AdminOfferHeader
              offer={offer}
              onBack={() => navigate("/admin/offers")}
              onEdit={() => navigate(`/create-offer?offerId=${id}`)}
              onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
              isHistoryOpen={isHistoryOpen}
            />

            {/* Cartes financières */}
            <AdminFinancialCards
              monthlyPayment={offer.monthly_payment}
              commission={offer.commission}
              commissionStatus={offer.commission_status}
              margin={offer.margin || calculatedMargin}
              marginPercentage={marginPercentage}
              showCommission={shouldShowCommission}
              showMargin={isAdmin()}
            />

            {/* Layout principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Colonne principale */}
              <div className="lg:col-span-2 space-y-6">
                <ClientInfoCard
                  clientName={offer.client_name}
                  clientEmail={offer.client_email}
                  clientPhone={offer.client_phone}
                />

                <EquipmentInfoCard
                  equipmentDescription={offer.equipment_description}
                  equipmentItems={offer.equipmentItems || offer.parsedEquipment}
                />

                {/* Nouveau: Documents section */}
                <OfferDocuments offerId={offer.id} />

                <AdminWorkflowTimeline
                  workflowLogs={workflowLogs}
                  loading={logsLoading}
                />
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <AdminActionButtons
                  status={offer.workflow_status}
                  offerId={offer.id}
                  onSendEmail={handleSendEmail}
                  sendingEmail={sendingEmail}
                  onRequestInfo={() => setIsRequestInfoModalOpen(true)}
                />

                <AdminOfferNotes
                  notes={offerNotes}
                  loading={notesLoading}
                />
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* Modal de demande d'informations */}
        <RequestInfoModal
          isOpen={isRequestInfoModalOpen}
          onClose={() => setIsRequestInfoModalOpen(false)}
          offerId={id}
          onSuccess={() => window.location.reload()}
        />

        {/* Modal d'historique */}
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50">
            <div className="relative w-11/12 max-w-4xl mx-auto my-12 bg-white rounded-md shadow-lg">
              <button
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                onClick={() => setIsHistoryOpen(false)}
              >
                Fermer
              </button>
              <div className="p-4">
                <OfferCompleteHistory offerId={id} />
              </div>
            </div>
          </div>
        )}
      </Container>
    </PageTransition>
  );
};

export default AdminOfferDetail;
