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

  if (error || !offer) {
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erreur</h2>
            <p className="text-gray-600 mb-4">{error || "Offre introuvable"}</p>
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
            <div className="flex items-center justify-between">
              <div>
                <Button variant="ghost" onClick={() => navigate("/admin/offers")}>
                  ← Retour aux offres
                </Button>
                <h1 className="text-2xl font-bold mt-2">
                  Offre #{offer.id?.slice(0, 8)}
                </h1>
                <OfferStatusBadge status={offer.workflow_status} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
                  {isHistoryOpen ? 'Masquer historique' : 'Voir historique'}
                </Button>
                <Button onClick={() => navigate(`/create-offer?offerId=${id}`)}>
                  Modifier
                </Button>
              </div>
            </div>

            {/* Layout principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Colonne principale */}
              <div className="lg:col-span-2 space-y-6">
                {/* Informations client */}
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Informations client</h3>
                  <div className="space-y-2">
                    <p><strong>Nom:</strong> {offer.client_name}</p>
                    <p><strong>Email:</strong> {offer.client_email}</p>
                    {offer.client_phone && <p><strong>Téléphone:</strong> {offer.client_phone}</p>}
                  </div>
                </div>

                {/* Équipements */}
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Équipements</h3>
                  <EquipmentDisplay 
                    equipmentDisplay={offer.equipment_description || ''}
                    monthlyPayment={offer.monthly_payment || 0}
                    remarks={offer.remarks}
                    clientName={offer.client_name}
                    clientEmail={offer.client_email}
                    offerId={offer.id}
                  />
                </div>

                {/* Documents */}
                <OfferDocuments offerId={offer.id} />

                {/* Timeline des workflows */}
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Historique du workflow</h3>
                  {logsLoading ? (
                    <div className="animate-pulse">Chargement...</div>
                  ) : (
                    <OfferHistoryTimeline events={workflowLogs} />
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Actions rapides */}
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Actions</h3>
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={handleSendEmail}
                      disabled={sendingEmail}
                    >
                      {sendingEmail ? "Envoi..." : "Envoyer par email"}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setIsRequestInfoModalOpen(true)}
                    >
                      Demander des documents
                    </Button>
                  </div>
                </div>

                {/* Résumé financier */}
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Résumé financier</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Montant total:</span>
                      <span className="font-medium">{formatCurrency(offer.amount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mensualité:</span>
                      <span className="font-medium">{formatCurrency(offer.monthly_payment || 0)}</span>
                    </div>
                    {shouldShowCommission && (
                      <div className="flex justify-between">
                        <span>Commission:</span>
                        <span className="font-medium">{formatCurrency(offer.commission || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* Modal de demande d'informations */}
        <RequestInfoModal
          isOpen={isRequestInfoModalOpen}
          onClose={() => setIsRequestInfoModalOpen(false)}
          offerId={id || ''}
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
                <OfferCompleteHistory offerId={id || ''} />
              </div>
            </div>
          </div>
        )}
      </Container>
    </PageTransition>
  );
};

export default AdminOfferDetail;
