import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { ArrowLeft, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateSignatureLink } from "@/services/offers/offerSignature";
import { sendOfferReadyEmail } from "@/services/emailService";
import OfferStatusCard from "@/components/offers/detail/OfferStatusCard";
import ClientInfoCard from "@/components/offers/detail/ClientInfoCard";
import EquipmentInfoCard from "@/components/offers/detail/EquipmentInfoCard";
import FinancialSummaryCard from "@/components/offers/detail/FinancialSummaryCard";
import QuickActionsCard from "@/components/offers/detail/QuickActionsCard";
import { hasCommission } from "@/utils/offerTypeTranslator";

const PartnerOfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      if (!user || !id) return;

      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) {
        toast.error("Offre non trouvée ou vous n'avez pas les droits d'accès");
        navigate('/partner/dashboard');
        return;
      }

      setOffer(data);
      
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/client/offers/${data.id}`);
      setSignatureUrl(`${baseUrl}/client/offer/${data.id}/sign`);
    } catch (error) {
      console.error("Error fetching offer details:", error);
      toast.error("Erreur lors du chargement des détails de l'offre");
      setLoadError("Une erreur s'est produite");
      navigate('/partner/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferDetails();
  }, [id, user]);

  const handleSendToClient = async () => {
    if (!offer) return;
    
    setIsSending(true);
    try {
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
      
      // Mettre à jour le statut si l'offre est en brouillon
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
      
      // Envoyer l'email
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
        toast.error("Erreur lors de l'envoi de l'email au client");
      }
      
    } catch (error) {
      console.error("Error sending offer ready email:", error);
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPrintingPdf(true);
    try {
      // Simuler la génération PDF
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.info("Fonctionnalité PDF en cours de développement");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Erreur lors du téléchargement du PDF");
    } finally {
      setIsPrintingPdf(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex justify-center items-center h-[70vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-2">Chargement des détails de l'offre...</p>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }
  
  if (loadError || !offer) {
    return (
      <PageTransition>
        <Container>
          <div className="py-8">
            <Button variant="outline" onClick={() => navigate("/partner/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
            <div className="mt-8 text-center">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Offre introuvable</h2>
              <p className="text-muted-foreground">
                L'offre demandée n'existe pas ou vous n'avez pas les droits d'accès.
              </p>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  const shouldShowCommission = hasCommission(offer.type);

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          {/* En-tête */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate("/partner/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  Offre #{id?.substring(0, 8).toUpperCase()}
                </h1>
                <p className="text-muted-foreground">
                  Pour {offer.client_name}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchOfferDetails}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Alerte pour les informations demandées */}
          {(offer.workflow_status === 'info_requested' || offer.status === 'rejected') && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Action requise</AlertTitle>
              <AlertDescription>
                Des informations supplémentaires sont requises pour cette offre. 
                Veuillez contacter l'administrateur pour plus de détails.
              </AlertDescription>
            </Alert>
          )}

          {/* Layout principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              <ClientInfoCard 
                clientName={offer.client_name}
                clientEmail={offer.client_email}
                clientCompany={offer.clients?.company}
              />
              
              <EquipmentInfoCard 
                equipmentDescription={offer.equipment_description}
              />
              
              <FinancialSummaryCard 
                monthlyPayment={offer.monthly_payment}
                financedAmount={offer.financed_amount}
                totalAmount={offer.amount}
                commission={shouldShowCommission ? offer.commission : undefined}
                showCommission={shouldShowCommission}
                margin={offer.margin}
                coefficient={offer.coefficient}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <OfferStatusCard 
                status={offer.workflow_status || offer.status}
                createdAt={offer.created_at}
                lastUpdated={offer.updated_at}
                signedAt={offer.signed_at}
                signerName={offer.signer_name}
              />
              
              <QuickActionsCard 
                offerId={offer.id}
                status={offer.workflow_status || offer.status}
                shareUrl={shareUrl}
                signatureUrl={signatureUrl}
                onSendToClient={handleSendToClient}
                onDownloadPdf={handleDownloadPdf}
                isPrintingPdf={isPrintingPdf}
                isSending={isSending}
              />
            </div>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default PartnerOfferDetail;
