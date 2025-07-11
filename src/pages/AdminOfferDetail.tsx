import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getOfferById, updateOfferStatus } from "@/services/offerService";
import { supabase } from "@/integrations/supabase/client";
import { sendOfferReadyEmail } from "@/services/emailService";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePdfGeneration } from "@/hooks/offers/usePdfGeneration";
import { useDocumentMonitoring } from "@/hooks/offers/useDocumentMonitoring";
import OfferTypeTag from "@/components/offers/OfferTypeTag";

// Import des composants améliorés
import InteractiveWorkflowStepper from "@/components/offers/detail/InteractiveWorkflowStepper";
import ClientSection from "@/components/offers/detail/ClientSection";

import FinancialSection from "@/components/offers/detail/FinancialSection";
import CompactActionsSidebar from "@/components/offers/detail/CompactActionsSidebar";
import ImprovedOfferHistory from "@/components/offers/detail/ImprovedOfferHistory";
import OfferDocuments from "@/components/offers/OfferDocuments";
import RequestInfoModal from "@/components/offers/RequestInfoModal";
import ScoringModal from "@/components/offers/detail/ScoringModal";

const AdminOfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [scoringLoading, setScoringLoading] = useState(false);
  const [scoringModalOpen, setScoringModalOpen] = useState(false);
  const [scoringAnalysisType, setScoringAnalysisType] = useState<'internal' | 'leaser'>('internal');

  const { isPrintingPdf, handlePrintPdf } = usePdfGeneration(id);

  const handleStatusChange = (newStatus: string) => {
    setOffer({ ...offer, workflow_status: newStatus });
  };
  
  // Surveillance automatique des documents pour l'analyse interne
  useDocumentMonitoring({
    offerId: id || '',
    currentStatus: offer?.workflow_status || '',
    analysisType: 'internal',
    onStatusChange: handleStatusChange
  });

  // Surveillance automatique des documents pour l'analyse leaser
  useDocumentMonitoring({
    offerId: id || '',
    currentStatus: offer?.workflow_status || '',
    analysisType: 'leaser',
    onStatusChange: handleStatusChange
  });

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

  const handleSendEmail = async () => {
    if (!offer || !offer.id) {
      toast.error("Impossible d'envoyer l'email");
      return;
    }

    try {
      setSendingEmail(true);
      console.log("🚀 DÉBUT PROCESSUS ENVOI EMAIL");
      console.log("📋 Détails de l'offre:", {
        id: offer.id,
        client_name: offer.client_name,
        client_email: offer.client_email,
        workflow_status: offer.workflow_status
      });

      // Construire le lien de signature côté client avec la bonne route
      const offerLink = `${window.location.origin}/client/offer/${offer.id}/sign`;
      console.log("🔗 Lien de signature généré:", offerLink);

      // Formatter la description de l'équipement
      let equipmentDescription = offer.equipment_description || "Votre équipement";
      
      try {
        if (equipmentDescription.startsWith('[{') && equipmentDescription.endsWith('}]')) {
          const equipmentItems = JSON.parse(equipmentDescription);
          if (Array.isArray(equipmentItems) && equipmentItems.length > 0) {
            if (equipmentItems.length === 1) {
              equipmentDescription = equipmentItems[0].title || "Votre équipement";
            } else {
              equipmentDescription = `${equipmentItems.length} équipements dont ${equipmentItems[0].title}`;
            }
          }
        }
      } catch (e) {
        console.error("Erreur lors du parsing de la description de l'équipement:", e);
      }

      // Calculer les montants
      const amount = typeof offer.amount === 'string' ? Number(offer.amount) : (offer.amount || 0);
      const monthlyPayment = Number(offer.monthly_payment || 0);

      if (offer.workflow_status === 'draft') {
        const { error } = await supabase
          .from('offers')
          .update({ workflow_status: 'sent' })
          .eq('id', id);

        if (error) throw error;

        setOffer({ ...offer, workflow_status: 'sent' });
      }

      // Envoyer l'email avec sendOfferReadyEmail
      const success = await sendOfferReadyEmail(
        offer.client_email,
        offer.client_name,
        {
          id: offer.id,
          description: equipmentDescription,
          amount: amount,
          monthlyPayment: monthlyPayment
        },
        offerLink
      );

      if (success) {
        toast.success("Email envoyé au client avec succès");
      } else {
        toast.error("Erreur lors de l'envoi de l'email");
      }
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

  const handlePreview = () => {
    // Ouvrir l'aperçu de l'offre dans un nouvel onglet avec la bonne route
    const previewUrl = `/client/offer/${id}`;
    window.open(previewUrl, '_blank');
  };


  const handleAnalysisClick = (analysisType: 'internal' | 'leaser') => {
    setScoringAnalysisType(analysisType);
    setScoringModalOpen(true);
  };

  const handleInternalScoring = async (score: 'A' | 'B' | 'C', reason?: string) => {
    setScoringLoading(true);
    try {
      let newStatus = '';
      switch (score) {
        case 'A': newStatus = 'internal_approved'; break;
        case 'B': newStatus = 'internal_docs_requested'; break;
        case 'C': newStatus = 'internal_rejected'; break;
      }
      
      const success = await updateOfferStatus(
        offer.id,
        newStatus,
        offer.workflow_status,
        reason || `Score attribué: ${score}`
      );
      
      if (success) {
        setOffer({ ...offer, workflow_status: newStatus });
        toast.success(`Score ${score} attribué avec succès`);
      } else {
        toast.error("Erreur lors de l'attribution du score");
      }
    } catch (error) {
      console.error("Erreur lors du scoring interne:", error);
      toast.error("Erreur lors de l'attribution du score");
    } finally {
      setScoringLoading(false);
    }
  };

  const handleLeaserScoring = async (score: 'A' | 'B' | 'C', reason?: string) => {
    setScoringLoading(true);
    try {
      let newStatus = '';
      switch (score) {
        case 'A': newStatus = 'leaser_approved'; break;
        case 'B': newStatus = 'leaser_docs_requested'; break;
        case 'C': newStatus = 'leaser_rejected'; break;
      }
      
      const success = await updateOfferStatus(
        offer.id,
        newStatus,
        offer.workflow_status,
        reason || `Score attribué: ${score}`
      );
      
      if (success) {
        setOffer({ ...offer, workflow_status: newStatus });
        toast.success(`Score ${score} attribué avec succès`);
      } else {
        toast.error("Erreur lors de l'attribution du score");
      }
    } catch (error) {
      console.error("Erreur lors du scoring leaser:", error);
      toast.error("Erreur lors de l'attribution du score");
    } finally {
      setScoringLoading(false);
    }
  };

  const getScoreFromStatus = (status: string): 'A' | 'B' | 'C' | null => {
    if (status.includes('approved')) return 'A';
    if (status.includes('docs_requested')) return 'B';
    if (status.includes('rejected')) return 'C';
    return null;
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
          <div className="p-2 md:p-4 space-y-6 pb-8">
            {/* En-tête avec navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/admin/offers")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </Button>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">
                      Offre #{offer.id?.slice(0, 8)}
                    </h1>
                    {offer.type && <OfferTypeTag type={offer.type} size="md" />}
                  </div>
                  <p className="text-gray-600">{offer.client_name}</p>
                </div>
              </div>
            </div>

            {/* Stepper de progression interactif */}
            <InteractiveWorkflowStepper 
              currentStatus={offer.workflow_status || 'draft'}
              offerId={offer.id}
              onStatusChange={handleStatusChange}
              internalScore={offer.internal_score}
              leaserScore={offer.leaser_score}
              onAnalysisClick={handleAnalysisClick}
              offer={offer}
            />


            {/* Layout principal avec sidebar - structure flexible pour le scroll */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
              
              {/* Contenu principal - permettre le débordement */}
              <div className="lg:col-span-3 min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="financial" className="text-xs sm:text-sm">Financier</TabsTrigger>
                    <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs sm:text-sm">Historique</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4 mt-4 overflow-visible">
                    <ClientSection offer={offer} />
                  </TabsContent>
                  
                  <TabsContent value="financial" className="mt-4 overflow-visible">
                    <FinancialSection offer={offer} />
                  </TabsContent>
                  
                  <TabsContent value="documents" className="space-y-4 mt-4 overflow-visible">
                    <OfferDocuments offerId={offer.id} />
                  </TabsContent>
                  
                  <TabsContent value="history" className="space-y-4 mt-4 overflow-visible">
                    <ImprovedOfferHistory offerId={offer.id} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar des actions compacte */}
              <div className="lg:col-span-1">
                <CompactActionsSidebar
                  offer={offer}
                  onSendEmail={handleSendEmail}
                  onRequestInfo={() => setIsRequestInfoModalOpen(true)}
                  onEdit={handleEditOffer}
                  onPreview={handlePreview}
                  onDownloadPdf={handlePrintPdf}
                  sendingEmail={sendingEmail}
                  isGeneratingPdf={isPrintingPdf}
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

        {/* Modal de scoring */}
        <ScoringModal
          isOpen={scoringModalOpen}
          onClose={() => setScoringModalOpen(false)}
          offerId={offer.id}
          currentStatus={offer.workflow_status}
          analysisType={scoringAnalysisType}
          onScoreAssigned={scoringAnalysisType === 'internal' ? handleInternalScoring : handleLeaserScoring}
          isLoading={scoringLoading}
        />
      </Container>
    </PageTransition>
  );
};

export default AdminOfferDetail;
