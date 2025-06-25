
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getOfferById, getWorkflowLogs, getOfferNotes } from "@/services/offerService";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";

// Import des nouveaux composants
import WorkflowStepper from "@/components/offers/detail/WorkflowStepper";
import ClientSection from "@/components/offers/detail/ClientSection";
import EquipmentSection from "@/components/offers/detail/EquipmentSection";
import FinancialSection from "@/components/offers/detail/FinancialSection";
import ActionsSidebar from "@/components/offers/detail/ActionsSidebar";
import OfferHistoryTimeline from "@/components/offers/OfferHistoryTimeline";
import OfferCompleteHistory from "@/components/offers/OfferCompleteHistory";
import OfferDocuments from "@/components/offers/OfferDocuments";
import RequestInfoModal from "@/components/offers/RequestInfoModal";

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
  const [activeTab, setActiveTab] = useState("overview");

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

  const handleEditOffer = () => {
    navigate(`/create-offer?offerId=${id}`);
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

  return (
    <PageTransition>
      <Container>
        <TooltipProvider>
          <div className="p-4 md:p-6 space-y-6">
            {/* En-tête avec navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/admin/offers")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour aux offres
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">
                    Offre #{offer.id?.slice(0, 8)}
                  </h1>
                  <p className="text-gray-600">{offer.client_name}</p>
                </div>
              </div>
            </div>

            {/* Stepper de progression */}
            <WorkflowStepper 
              currentStatus={offer.workflow_status || 'draft'} 
            />

            {/* Layout principal avec sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Contenu principal */}
              <div className="lg:col-span-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="equipment">Équipements</TabsTrigger>
                    <TabsTrigger value="financial">Financier</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="history">Historique</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-6 mt-6">
                    <ClientSection offer={offer} />
                    <EquipmentSection offer={offer} />
                    <FinancialSection offer={offer} />
                  </TabsContent>
                  
                  <TabsContent value="equipment" className="mt-6">
                    <EquipmentSection offer={offer} />
                  </TabsContent>
                  
                  <TabsContent value="financial" className="mt-6">
                    <FinancialSection offer={offer} />
                  </TabsContent>
                  
                  <TabsContent value="documents" className="space-y-6 mt-6">
                    <OfferDocuments offerId={offer.id} />
                  </TabsContent>
                  
                  <TabsContent value="history" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6">
                      <h3 className="text-lg font-semibold mb-4">Historique du workflow</h3>
                      {logsLoading ? (
                        <div className="animate-pulse">Chargement...</div>
                      ) : (
                        <OfferHistoryTimeline events={workflowLogs} />
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar des actions */}
              <div className="lg:col-span-1">
                <ActionsSidebar
                  offer={offer}
                  onSendEmail={handleSendEmail}
                  onRequestInfo={() => setIsRequestInfoModalOpen(true)}
                  onEdit={handleEditOffer}
                  sendingEmail={sendingEmail}
                />
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

        {/* Modal d'historique complet */}
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
