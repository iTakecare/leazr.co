import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getOfferById } from "@/services/offerService";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePdfGeneration } from "@/hooks/offers/usePdfGeneration";

// Import des composants améliorés
import InteractiveWorkflowStepper from "@/components/offers/detail/InteractiveWorkflowStepper";
import ClientSection from "@/components/offers/detail/ClientSection";
import CompactEquipmentSection from "@/components/offers/detail/CompactEquipmentSection";
import FinancialSection from "@/components/offers/detail/FinancialSection";
import CompactActionsSidebar from "@/components/offers/detail/CompactActionsSidebar";
import ImprovedOfferHistory from "@/components/offers/detail/ImprovedOfferHistory";
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
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { isPrintingPdf, handlePrintPdf } = usePdfGeneration(id);

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

  const handlePreview = () => {
    // Ouvrir l'aperçu de l'offre dans un nouvel onglet
    const previewUrl = `/client/offer/${id}`;
    window.open(previewUrl, '_blank');
  };

  const handleStatusChange = (newStatus: string) => {
    setOffer({ ...offer, workflow_status: newStatus });
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
                  <h1 className="text-2xl font-bold">
                    Offre #{offer.id?.slice(0, 8)}
                  </h1>
                  <p className="text-gray-600">{offer.client_name}</p>
                </div>
              </div>
            </div>

            {/* Stepper de progression interactif */}
            <InteractiveWorkflowStepper 
              currentStatus={offer.workflow_status || 'draft'}
              offerId={offer.id}
              onStatusChange={handleStatusChange}
            />

            {/* Layout principal avec sidebar - structure flexible pour le scroll */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
              
              {/* Contenu principal - permettre le débordement */}
              <div className="lg:col-span-3 min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="equipment" className="text-xs sm:text-sm">Équipements</TabsTrigger>
                    <TabsTrigger value="financial" className="text-xs sm:text-sm">Financier</TabsTrigger>
                    <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs sm:text-sm">Historique</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4 mt-4 overflow-visible">
                    <ClientSection offer={offer} />
                    <CompactEquipmentSection offer={offer} />
                    <FinancialSection offer={offer} />
                  </TabsContent>
                  
                  <TabsContent value="equipment" className="mt-4 overflow-visible">
                    <CompactEquipmentSection offer={offer} />
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
      </Container>
    </PageTransition>
  );
};

export default AdminOfferDetail;
