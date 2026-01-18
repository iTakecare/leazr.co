import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { toast } from "sonner";
import { getWorkflowLogs, getOfferNotes, deleteOffer, generateSignatureLink } from "@/services/offerService";
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
    
    const toastId = toast.loading('Préparation du PDF...');
    setIsGeneratingPDF(true);
    
    try {
      // 1. Récupérer les équipements depuis la base de données
      const { getOfferEquipment } = await import('@/services/offers/offerEquipment');
      const equipmentData = await getOfferEquipment(offer.id);

      // Récupérer les données complètes du client depuis la table clients
      const { data: clientData } = await supabase
        .from('clients')
        .select('billing_address, billing_city, billing_postal_code, billing_country, phone')
        .eq('id', offer.client_id)
        .single();

      // Récupérer les paramètres de l'entreprise (logo, couleurs, nom)
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, logo_url, primary_color, secondary_color, name')
        .eq('id', offer.company_id)
        .single();

      if (!companyData?.id) {
        toast.error("Impossible de récupérer les informations de l'entreprise", { id: toastId });
        return;
      }

      // Formater l'adresse de facturation complète
      const billingAddress = clientData ? 
        [
          clientData.billing_address,
          clientData.billing_postal_code,
          clientData.billing_city,
          clientData.billing_country
        ].filter(Boolean).join(', ') 
        : '';

      // Convertir le logo en Base64 pour compatibilité html2canvas
      let companyLogoBase64 = null;
      if (companyData?.logo_url) {
        try {
          const response = await fetch(companyData.logo_url);
          const blob = await response.blob();
          companyLogoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.warn('⚠️ Erreur chargement logo:', error);
        }
      }

      // Récupérer les logos partenaires
      const { data: partnerLogosData } = await supabase
        .from('company_partner_logos')
        .select('logo_url')
        .eq('company_id', companyData.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      // Récupérer les valeurs de l'entreprise
      const { data: companyValuesData } = await supabase
        .from('company_values')
        .select('title, description, icon_url')
        .eq('company_id', companyData.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(3);

      // Récupérer les métriques de l'entreprise
      const { data: companyMetricsData } = await supabase
        .from('company_metrics')
        .select('label, value, icon_name')
        .eq('company_id', companyData.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(3);

      // Récupérer les blocs de contenu texte
      const { data: contentBlocksData } = await supabase
        .from('pdf_content_blocks')
        .select('page_name, block_key, content')
        .eq('company_id', companyData.id);

      // Créer un map pour faciliter l'accès
      const contentBlocksMap: Record<string, Record<string, string>> = {};
      contentBlocksData?.forEach(block => {
        if (!contentBlocksMap[block.page_name]) {
          contentBlocksMap[block.page_name] = {};
        }
        contentBlocksMap[block.page_name][block.block_key] = block.content;
      });

      // 2. Créer un conteneur VISIBLE
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '210mm';
      container.style.minHeight = '297mm';
      container.style.background = 'white';
      container.style.zIndex = '9999';
      document.body.appendChild(container);

      // 3. Préparer les données pour CommercialOffer
      const isPurchase = offer?.is_purchase === true;
      
      const totalSellingPriceFromEquipment = equipmentData.reduce(
        (sum: number, eq: any) => sum + ((Number(eq.selling_price) || 0) * (Number(eq.quantity) || 1)),
        0
      );
      const totalSellingPrice = isPurchase && offer.financed_amount 
        ? Number(offer.financed_amount) 
        : totalSellingPriceFromEquipment;
      
      const offerData = {
        offerNumber: offer.dossier_number || `OFF-${Date.now().toString().slice(-6)}`,
        offerDate: offer.created_at ? new Date(offer.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'),
        clientName: offer.client_name || 'Client',
        clientEmail: offer.client_email || clientData?.email || '',
        clientPhone: clientData?.phone || '',
        clientCompany: offer.client_company || '',
        clientAddress: billingAddress,
        companyLogo: companyLogoBase64,
        companyName: companyData?.name || 'iTakecare',
        showPrintButton: false,
        isPDFMode: true,
        isPurchase: isPurchase,
        totalSellingPrice: totalSellingPrice,
        equipment: equipmentData.map((eq: any) => ({
          id: eq.id,
          title: eq.title,
          quantity: eq.quantity || 1,
          monthlyPayment: isPurchase ? 0 : (eq.monthly_payment || 0),
          sellingPrice: eq.selling_price || 0,
          imageUrl: eq.image_url || eq.product?.image_urls?.[0] || eq.product?.image_url || null,
          attributes: eq.attributes?.reduce((acc: any, attr: any) => {
            acc[attr.key] = attr.value;
            return acc;
          }, {}) || {},
          specifications: eq.specifications?.reduce((acc: any, spec: any) => {
            acc[spec.key] = spec.value;
            return acc;
          }, {}) || {}
        })),
        totalMonthly: isPurchase ? 0 : (Number(offer.monthly_payment) || 0),
        contractDuration: Number(offer.duration) || 36,
        fileFee: isPurchase ? 0 : (Number(offer.file_fee) || 0),
        insuranceCost: isPurchase ? 0 : (Number(offer.annual_insurance) || 0),
        downPayment: Number(offer.down_payment) || 0,
        adjustedMonthlyPayment: (() => {
          const dp = Number(offer.down_payment) || 0;
          const coef = Number(offer.coefficient) || 0;
          if (dp > 0 && coef > 0) {
            const baseFinancedAmount = totalSellingPrice > 0 
              ? totalSellingPrice 
              : (coef > 0 && (offer.monthly_payment || 0) > 0 
                  ? ((Number(offer.monthly_payment) || 0) * 100) / coef 
                  : Number(offer.financed_amount) || Number(offer.amount) || 0);
            const financedAfterDp = Math.max(0, baseFinancedAmount - dp);
            return Math.round((financedAfterDp * coef) / 100 * 100) / 100;
          }
          return Number(offer.monthly_payment) || 0;
        })(),
        financedAmountAfterDownPayment: (() => {
          const dp = Number(offer.down_payment) || 0;
          const coef = Number(offer.coefficient) || 0;
          const baseFinancedAmount = totalSellingPrice > 0 
            ? totalSellingPrice 
            : (coef > 0 && (offer.monthly_payment || 0) > 0 
                ? ((Number(offer.monthly_payment) || 0) * 100) / coef 
                : Number(offer.financed_amount) || Number(offer.amount) || 0);
          return Math.max(0, baseFinancedAmount - dp);
        })(),
        partnerLogos: partnerLogosData?.map(logo => logo.logo_url) || [],
        companyValues: companyValuesData?.map(v => ({
          title: v.title,
          description: v.description,
          iconUrl: v.icon_url,
        })) || [],
        metrics: companyMetricsData?.map(m => ({
          label: m.label,
          value: m.value,
          iconName: m.icon_name,
        })) || [],
        contentBlocks: {
          cover: {
            greeting: contentBlocksMap['cover']?.['greeting'] || '<p>Madame, Monsieur,</p>',
            introduction: isPurchase 
              ? (contentBlocksMap['cover']?.['introduction_purchase'] || '<p>Nous avons le plaisir de vous présenter notre offre d\'achat.</p>')
              : (contentBlocksMap['cover']?.['introduction'] || '<p>Nous avons le plaisir de vous présenter notre offre commerciale.</p>'),
            validity: contentBlocksMap['cover']?.['validity'] || '<p>Cette offre est valable 30 jours.</p>',
          },
          equipment: {
            title: contentBlocksMap['equipment']?.['title'] || 'Détail de l\'équipement',
            footer_note: contentBlocksMap['equipment']?.['footer_note'] || 'Tous nos équipements sont garantis.',
          },
          conditions: {
            general_conditions: contentBlocksMap['conditions']?.['general_conditions'] || '<h3>Conditions générales</h3>',
            sale_general_conditions: contentBlocksMap['conditions']?.['sale_general_conditions'] || '',
            additional_info: contentBlocksMap['conditions']?.['additional_info'] || '',
            contact_info: contentBlocksMap['conditions']?.['contact_info'] || 'Contactez-nous pour plus d\'informations.',
          },
        },
      };

      // 4a. Attendre que toutes les polices soient chargées
      toast.loading('Chargement des polices...', { id: toastId });
      if ('fonts' in document) {
        await document.fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 800));

      // 4b. Activer le mode PDF
      container.classList.add('pdf-mode');

      // 4c. Render le composant React dans le conteneur
      const root = createRoot(container);
      root.render(
        React.createElement('div', 
          { 
            style: { 
              width: '100%', 
              background: 'white', 
              fontFamily: 'Inter, sans-serif' 
            } 
          },
          React.createElement(CommercialOffer, offerData)
        )
      );

      // 5. Attendre que TOUT soit chargé
      toast.loading('Chargement du contenu...', { id: toastId });
      await new Promise(resolve => setTimeout(resolve, 3500));

      // 6. Vérifier qu'il y a du contenu
      const pages = container.querySelectorAll('.page');
      
      if (pages.length === 0) {
        throw new Error('Aucune page trouvée. Le composant ne s\'est pas rendu correctement.');
      }

      // 7. Créer le PDF avec jsPDF
      toast.loading('Génération du PDF...', { id: toastId });
      const { default: JsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const pdf = new JsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 8. Convertir chaque page en image et l'ajouter au PDF
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        const canvas = await html2canvas(page, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      // 9. Télécharger le PDF
      const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      const clientName = (offer.client_company || offer.client_name || offerData.clientName || 'Client')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 30);
      const filename = `Offre_${offerData.offerNumber}_${clientName}_${date}.pdf`;
      pdf.save(filename);

      // 9b. Retirer le mode PDF
      container.classList.remove('pdf-mode');

      // 10. Nettoyage
      root.unmount();
      document.body.removeChild(container);

      // 11. Notification de succès
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement des détails de l'offre...</span>
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
