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
import AmbassadorOfferHeader from "@/components/offers/detail/AmbassadorOfferHeader";
import AmbassadorFinancialCards from "@/components/offers/detail/AmbassadorFinancialCards";
import AmbassadorActionButtons from "@/components/offers/detail/AmbassadorActionButtons";
import AmbassadorWorkflowTimeline from "@/components/offers/detail/AmbassadorWorkflowTimeline";
import AmbassadorOfferNotes from "@/components/offers/detail/AmbassadorOfferNotes";
import ClientInfoCard from "@/components/offers/detail/ClientInfoCard";
import EquipmentInfoCard from "@/components/offers/detail/EquipmentInfoCard";
import AmbassadorAddNoteCard from "@/components/offers/detail/AmbassadorAddNoteCard";
import { usePdfGeneration } from "@/hooks/offers/usePdfGeneration";

const AmbassadorOfferDetail = () => {
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
  
  const { isPrintingPdf, handlePrintPdf } = usePdfGeneration(id);
  
  useEffect(() => {
    const fetchOfferDetails = async () => {
      if (!id || !user) return;
      
      try {
        setLoading(true);
        const offerData = await getOfferById(id);
        
        if (!offerData || offerData.user_id !== user.id) {
          setError("Vous n'avez pas accès à cette offre");
          toast.error("Vous n'avez pas accès à cette offre");
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
  }, [id, user]);
  
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
        
        setOffer({ ...offer, workflow_status: 'sent' });
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
            <Button onClick={() => navigate("/ambassador/offers")}>
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
            <Button onClick={() => navigate("/ambassador/offers")}>
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
            <AmbassadorOfferHeader 
              offer={offer}
              onBack={() => navigate("/ambassador/offers")}
              onRefresh={() => window.location.reload()}
            />

            {/* Cartes financières */}
            <AmbassadorFinancialCards 
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
                
                <AmbassadorWorkflowTimeline 
                  workflowLogs={workflowLogs}
                  loading={logsLoading}
                />
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <AmbassadorActionButtons 
                  status={offer.workflow_status}
                  offerId={offer.id}
                  onSendSignatureLink={shareSignatureLink}
                  onDownloadPdf={handlePrintPdf}
                  sendingEmail={sendingEmail}
                  isPdfGenerating={isPrintingPdf}
                />
                
                <AmbassadorAddNoteCard 
                  offerId={offer.id}
                  onNoteAdded={handleNoteAdded}
                />
                
                <AmbassadorOfferNotes 
                  notes={offerNotes}
                  loading={notesLoading}
                />
              </div>
            </div>
          </div>
        </TooltipProvider>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorOfferDetail;
