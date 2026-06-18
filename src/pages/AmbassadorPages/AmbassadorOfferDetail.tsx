import React, { useState, useEffect, useCallback } from "react";
import WaveLoader from "@/components/ui/WaveLoader";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { toast } from "sonner";
import { getWorkflowLogs, getOfferNotes, deleteOffer, generateSignatureLink } from "@/services/offerService";
import { fetchOfferCompanyBranding } from "@/services/offers/offerCompanyBranding";
import { useOfferDetail } from "@/hooks/offers/useOfferDetail";
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
import { createRoot } from 'react-dom/client';
import CommercialOffer from '@/components/offers/CommercialOffer';

// Import des nouveaux composants modulaires
import AmbassadorOfferHeader from "@/components/offers/detail/AmbassadorOfferHeader";
import AmbassadorFinancialCards from "@/components/offers/detail/AmbassadorFinancialCards";
import CompactActionsSidebar from "@/components/offers/detail/CompactActionsSidebar";
import AmbassadorWorkflowTimeline from "@/components/offers/detail/AmbassadorWorkflowTimeline";
import AmbassadorOfferNotes from "@/components/offers/detail/AmbassadorOfferNotes";
import ClientInfoCard from "@/components/offers/detail/ClientInfoCard";
import CompactEquipmentSection from "@/components/offers/detail/CompactEquipmentSection";
import AmbassadorAddNoteCard from "@/components/offers/detail/AmbassadorAddNoteCard";
import OfferEditConfiguration from "@/components/offer/OfferEditConfiguration";
import { EmailOfferDialog } from "@/components/offers/EmailOfferDialog";

const AmbassadorOfferDetail = () => {
  console.log('🔥 AMBASSADOR OFFER DETAIL - Component starting to execute');
  console.log('🔥 AMBASSADOR OFFER DETAIL - Current pathname:', window.location.pathname);
  
  const { id } = useParams<{ id: string }>();
  console.log('🔥 AMBASSADOR OFFER DETAIL - Offer ID from params:', id);
  
  const { user } = useAuth();
  console.log('🔥 AMBASSADOR OFFER DETAIL - User from auth:', !!user);
  
  const { navigateToAmbassador } = useRoleNavigation();
  console.log('🔥 AMBASSADOR OFFER DETAIL - Navigation hook loaded');
  
  // Utiliser le hook robuste useOfferDetail
  console.log('🔥 AMBASSADOR OFFER DETAIL - About to call useOfferDetail with ID:', id);
  const { offer, loading, error, fetchOffer } = useOfferDetail(id || "");
  console.log('🔥 AMBASSADOR OFFER DETAIL - useOfferDetail returned:', { offer: !!offer, loading, error });
  
  const [sendingEmail, setSendingEmail] = useState(false);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [offerNotes, setOfferNotes] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  
  
  
  // Charger les workflow logs et notes séparément
  useEffect(() => {
    if (id) {
      fetchWorkflowLogs(id);
      fetchOfferNotes(id);
    }
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
          .eq('id', offer.id)
          .eq('user_id', user?.id);
          
        if (error) throw error;
        
        fetchOffer(); // Recharger les données mises à jour
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
  
  const shareSignatureLink = async () => {
    if (offer.workflow_status !== 'sent' && offer.workflow_status !== 'draft') {
      toast.info("Cette offre a déjà été " + (offer.workflow_status === 'approved' ? "signée" : "traitée"));
      return;
    }
    
    try {
      console.log("🚀 DÉBUT PROCESSUS ENVOI EMAIL");
      console.log("📋 Détails de l'offre:", {
        id: offer.id,
        client_name: offer.client_name,
        client_email: offer.client_email,
        workflow_status: offer.workflow_status
      });
      
      // Exécuter le diagnostic en cas d'erreur pour aider au débogage
      await logUserProfileDiagnostics();
      
      // Construire le lien de signature côté client avec la bonne route
      const offerLink = `${window.location.origin}/client/offer/${offer.id}/sign`;
      console.log("🔗 Lien de signature généré:", offerLink);
      
      if (offer.workflow_status === 'draft') {
        const { error } = await supabase
          .from('offers')
          .update({ workflow_status: 'sent' })
          .eq('id', id);
          
        if (error) {
          console.error("Error updating offer status:", error);
          toast.error("Erreur lors de la mise à jour du statut de l'offre");
          return;
        }
        
        fetchOffer(); // Recharger les données mises à jour
      }
      
      // Formater la description de l'équipement
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
        toast.success("Lien de signature envoyé au client avec succès");
      } else {
        toast.error("Erreur lors de l'envoi de l'email au client");
        console.error("❌ Échec de l'envoi de l'email - Lancement du diagnostic...");
        await logUserProfileDiagnostics();
        return;
      }
      
    } catch (error) {
      console.error("Error sending offer ready email:", error);
      toast.error("Erreur lors de l'envoi de l'email");
      
      console.error("❌ Exception lors de l'envoi - Lancement du diagnostic...");
      await logUserProfileDiagnostics();
    }
  };

  const isAdmin = useCallback(() => {
    return user?.role === 'admin';
  }, [user]);

  // Handlers pour CompactActionsSidebar
  const handleEditOffer = () => {
    navigateToAmbassador(`edit-offer/${offer?.id}`);
  };

  // Générer le PDF de l'offre (même logique que l'admin)
  const handleGeneratePDF = async () => {
    if (!offer) return;

    const toastId = toast.loading('Génération du PDF...');
    setIsGeneratingPDF(true);

    try {
      // Moteur de rendu PDF unique (cf. commercialOfferPdfService).
      const { downloadCommercialOfferPDF } = await import('@/services/commercialOfferPdfService');
      await downloadCommercialOfferPDF(offer.id);
      toast.success('PDF téléchargé avec succès !', { id: toastId });
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Erreur lors de la génération du PDF", { id: toastId });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Ouvrir le lien public de l'offre
  const handleOpenPublicLink = () => {
    if (!offer) return;
    const link = generateSignatureLink(offer.id);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Supprimer l'offre
  const handleDeleteOffer = async () => {
    if (!offer) return;
    
    try {
      const success = await deleteOffer(offer.id);
      if (success) {
        toast.success("Offre supprimée avec succès");
        navigateToAmbassador('offers');
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression de l'offre");
    }
  };

  console.log('🔥 AMBASSADOR OFFER DETAIL - Before loading check, loading:', loading);
  
  if (loading) {
    console.log('🔥 AMBASSADOR OFFER DETAIL - Showing loading state');
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center h-64">
            <WaveLoader message="Chargement des détails de l'offre..." />
          </div>
        </Container>
      </PageTransition>
    );
  }
  
  if (error) {
    console.log('🔥 AMBASSADOR OFFER DETAIL - Showing error state:', error);
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erreur</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigateToAmbassador("offers")}>
              Retour aux offres
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }
  
  if (!offer) {
    console.log('🔥 AMBASSADOR OFFER DETAIL - No offer found, showing not found state');
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Offre introuvable</h2>
            <p className="text-gray-600 mb-4">Cette offre n'existe pas ou a été supprimée.</p>
            <Button onClick={() => navigateToAmbassador("offers")}>
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

  console.log('🔥 AMBASSADOR OFFER DETAIL - About to render main content with offer:', {
    id: offer.id,
    client_name: offer.client_name,
    workflow_status: offer.workflow_status
  });

  // FULL RENDER – Ambassador view aligned with Admin layout
  return (
    <PageTransition>
      <Container>
        <div className="py-6 space-y-6">
          <AmbassadorOfferHeader
            offer={offer}
            onBack={() => navigateToAmbassador("offers")}
            onRefresh={() => {
              fetchOffer();
              if (id) {
                fetchWorkflowLogs(id);
                fetchOfferNotes(id);
              }
            }}
          />

          <AmbassadorFinancialCards
            monthlyPayment={Number(offer.monthly_payment || 0)}
            commission={shouldShowCommission ? Number(offer.commission || 0) : undefined}
            commissionStatus={offer.commission_status}
            margin={calculatedMargin}
            marginPercentage={marginPercentage}
            showCommission={shouldShowCommission}
            showMargin={false}
            fileFee={offer.file_fee}
            annualInsurance={offer.annual_insurance}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              <ClientInfoCard
                clientName={offer.client_name}
                clientEmail={offer.client_email}
                clientCompany={offer.clients?.company}
              />

              <CompactEquipmentSection offer={offer} hideFinancialColumns />

              {/* Workflow history */}
              <AmbassadorWorkflowTimeline workflowLogs={workflowLogs} loading={logsLoading} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <CompactActionsSidebar
                offer={offer}
                onEdit={handleEditOffer}
                onGeneratePDF={handleGeneratePDF}
                onSendEmail={() => setEmailDialogOpen(true)}
                onOpenPublicLink={handleOpenPublicLink}
                onDelete={handleDeleteOffer}
                isGeneratingPDF={isGeneratingPDF}
              />

              <OfferEditConfiguration
                offerId={offer.id}
                currentSource={offer.source}
                currentType={offer.type}
                currentSector={offer.business_sector}
                isPurchase={offer.is_purchase === true}
                currentWorkflowId={offer.workflow_template_id}
                onUpdate={() => {
                  fetchOffer();
                  if (id) {
                    fetchWorkflowLogs(id);
                    fetchOfferNotes(id);
                  }
                }}
              />

              <AmbassadorOfferNotes notes={offerNotes} loading={notesLoading} />
              <AmbassadorAddNoteCard offerId={offer.id} onNoteAdded={handleNoteAdded} />
            </div>
          </div>
        </div>

        {/* Dialog pour envoyer l'offre par email */}
        <EmailOfferDialog
          open={emailDialogOpen}
          onOpenChange={(open) => {
            setEmailDialogOpen(open);
            if (!open) {
              fetchOffer();
              if (id) {
                fetchWorkflowLogs(id);
              }
            }
          }}
          offerId={offer.id}
          offerNumber={offer.dossier_number || `OFF-${offer.id.slice(0, 6)}`}
          clientEmail={offer.client_email}
          clientName={offer.client_name}
        />
      </Container>
    </PageTransition>
  );
};

export default AmbassadorOfferDetail;
