import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { toast } from "sonner";
import { getOfferById, updateOfferStatus, deleteOffer, generateSignatureLink } from "@/services/offerService";
import { supabase } from "@/integrations/supabase/client";
import { useOfferDocuments } from "@/hooks/useOfferDocuments";
import { sendOfferReadyEmail } from "@/services/emailService";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { AlertCircle, ArrowLeft, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useDocumentMonitoring } from "@/hooks/offers/useDocumentMonitoring";
import OfferTypeTag from "@/components/offers/OfferTypeTag";

// Import des composants améliorés
import InteractiveWorkflowStepper from "@/components/offers/detail/InteractiveWorkflowStepper";
import ClientSection from "@/components/offers/detail/ClientSection";
import NewEquipmentSection from "@/components/offers/detail/NewEquipmentSection";
import FinancialSection from "@/components/offers/detail/FinancialSection";
import CompactActionsSidebar from "@/components/offers/detail/CompactActionsSidebar";
import ImprovedOfferHistory from "@/components/offers/detail/ImprovedOfferHistory";
import OfferDocuments from "@/components/offers/OfferDocuments";
import RequestInfoModal from "@/components/offers/RequestInfoModal";
import ScoringModal from "@/components/offers/detail/ScoringModal";
import OfferEditConfiguration from "@/components/offer/OfferEditConfiguration";
import { OfferDateEditor } from "@/components/offers/detail/OfferDateEditor";
import EmailConfirmationModal from "@/components/offers/EmailConfirmationModal";
import RejectionEmailModal from "@/components/offers/RejectionEmailModal";
import { sendLeasingAcceptanceEmail, sendLeasingRejectionEmail } from "@/services/offers/offerEmail";
import { OfferReferenceEditor } from "@/components/offer/OfferReferenceEditor";
import { getOfferNotes } from "@/services/offers/offerNotes";
import AmbassadorOfferNotes from "@/components/offers/detail/AmbassadorOfferNotes";
import AmbassadorAddNoteCard from "@/components/offers/detail/AmbassadorAddNoteCard";
import { OfferFinancialFeesEditor } from "@/components/offer/OfferFinancialFeesEditor";
import { EmailOfferDialog } from "@/components/offers/EmailOfferDialog";
import { createRoot } from 'react-dom/client';
import CommercialOffer from '@/components/offers/CommercialOffer';

const AdminOfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { navigateToAdmin } = useRoleNavigation();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [scoringLoading, setScoringLoading] = useState(false);
  const [scoringModalOpen, setScoringModalOpen] = useState(false);
  const [scoringAnalysisType, setScoringAnalysisType] = useState<'internal' | 'leaser'>('internal');
  const [equipmentRefreshKey, setEquipmentRefreshKey] = useState(0);
  const [isDateEditorOpen, setIsDateEditorOpen] = useState(false);
  const [dateEditorType, setDateEditorType] = useState<'created' | 'request'>('request');
const [scoringTargetStatus, setScoringTargetStatus] = useState<string | null>(null);

// Modale d'email de validation après score A (leaser)
const [showEmailModal, setShowEmailModal] = useState(false);
const [emailModalReason, setEmailModalReason] = useState("Validation de l'offre après approbation du leaser");

// Modale d'email de refus après score C
const [showRejectionModal, setShowRejectionModal] = useState(false);
const [rejectionReason, setRejectionReason] = useState("");

// États pour les notes
const [offerNotes, setOfferNotes] = useState<any[]>([]);
const [notesLoading, setNotesLoading] = useState(false);

  // États pour les nouvelles actions
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Hook pour gérer les documents et upload links
  const { uploadLinks, generateUploadLink } = useOfferDocuments(id);

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

  const fetchOfferDetails = useCallback(async () => {
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
  }, [id]);

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

  // Calculer le total mensuel depuis les équipements
  const calculateTotalMonthlyPayment = (offer: any): number => {
    if (!offer.equipment_data || offer.equipment_data.length === 0) {
      return offer.monthly_payment || 0;
    }
    
    // monthly_payment en DB est DÉJÀ le total pour cet équipement (pas unitaire)
    return offer.equipment_data.reduce((total: number, item: any) => {
      return total + (item.monthly_payment || 0);
    }, 0);
  };

  useEffect(() => {
    fetchOfferDetails();
    if (id) {
      fetchOfferNotes(id);
    }
  }, [fetchOfferDetails, id]);

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
    navigateToAdmin(`edit-offer/${id}`);
  };

  const handlePreview = () => {
    // Ouvrir l'aperçu de l'offre dans un nouvel onglet avec la bonne route
    const previewUrl = `/client/offer/${id}`;
    window.open(previewUrl, '_blank');
  };

  // Générer le PDF de l'offre (même logique que handleGenerateOffer dans useOfferActions)
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

      console.log('🏢 Company Data:', {
        id: companyData?.id,
        name: companyData?.name,
        hasLogo: !!companyData?.logo_url
      });

      if (!companyData?.id) {
        console.error('❌ Company ID manquant !', { 
          offerId: offer.id, 
          companyId: offer.company_id,
          companyData 
        });
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
          console.log('✅ Logo converti en Base64');
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

      console.log('📊 Données récupérées:', {
        partnerLogos: partnerLogosData?.length || 0,
        companyValues: companyValuesData?.length || 0,
        companyMetrics: companyMetricsData?.length || 0
      });

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

      // 2. Créer un conteneur VISIBLE (crucial pour le rendu CSS)
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '210mm';
      container.style.minHeight = '297mm';
      container.style.background = 'white';
      container.style.zIndex = '9999';
      document.body.appendChild(container);

      // 3. Préparer les données COMPLÈTES pour CommercialOffer
      const offerData = {
        // Données de base
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
        
        // Équipements - Convertir le format DB vers le format CommercialOffer
        equipment: equipmentData.map((eq: any) => ({
          id: eq.id,
          title: eq.title,
          quantity: eq.quantity || 1,
          monthlyPayment: eq.monthly_payment || 0,
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
        
        // Totaux et informations financières
        totalMonthly: Number(offer.monthly_payment) || 0,
        contractDuration: Number(offer.duration) || 36,
        fileFee: Number(offer.file_fee) || 0,
        insuranceCost: Number(offer.annual_insurance) || 0,
        
        // Logos partenaires
        partnerLogos: partnerLogosData?.map(logo => logo.logo_url) || [],
        
        // Valeurs de l'entreprise
        companyValues: companyValuesData?.map(v => ({
          title: v.title,
          description: v.description,
          iconUrl: v.icon_url,
        })) || [],
        
        // Métriques de l'entreprise
        metrics: companyMetricsData?.map(m => ({
          label: m.label,
          value: m.value,
          iconName: m.icon_name,
        })) || [],
        
        // Blocs de contenu texte
        contentBlocks: {
          cover: {
            greeting: contentBlocksMap['cover']?.['greeting'] || '<p>Madame, Monsieur,</p>',
            introduction: contentBlocksMap['cover']?.['introduction'] || '<p>Nous avons le plaisir de vous présenter notre offre commerciale.</p>',
            validity: contentBlocksMap['cover']?.['validity'] || '<p>Cette offre est valable 30 jours.</p>',
          },
          equipment: {
            title: contentBlocksMap['equipment']?.['title'] || 'Détail de l\'équipement',
            footer_note: contentBlocksMap['equipment']?.['footer_note'] || 'Tous nos équipements sont garantis.',
          },
          conditions: {
            general_conditions: contentBlocksMap['conditions']?.['general_conditions'] || '<h3>Conditions générales</h3>',
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
      console.log(`📄 Pages trouvées: ${pages.length}`);
      console.log(`📏 Hauteur du conteneur: ${container.scrollHeight}px`);
      
      if (pages.length === 0) {
        console.error('❌ Aucune page trouvée. HTML:', container.innerHTML.substring(0, 500));
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
        console.log(`🖼️ Traitement page ${i + 1}/${pages.length}`);
        
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

  // Ouvrir le lien d'upload de documents
  const handleOpenUploadLink = async () => {
    if (!offer) return;
    
    // Vérifier s'il existe déjà un lien d'upload valide
    if (uploadLinks && uploadLinks.length > 0) {
      const validLink = uploadLinks[0]; // Le plus récent
      window.open(`/offer/documents/upload/${validLink.token}`, '_blank');
      return;
    }
    
    // Sinon, créer un nouveau lien d'upload
    try {
      const token = await generateUploadLink(
        ['balance_sheet', 'id_card_front', 'id_card_back'], 
        'Lien généré par l\'administrateur'
      );
      
      if (token) {
        window.open(`/offer/documents/upload/${token}`, '_blank');
        toast.success("Lien d'upload généré avec succès");
      } else {
        toast.error("Impossible de générer le lien d'upload");
      }
    } catch (error) {
      console.error("Erreur lors de la génération du lien:", error);
      toast.error("Erreur lors de la génération du lien");
    }
  };

  // Supprimer l'offre
  const handleDeleteOffer = async () => {
    if (!offer) return;
    
    try {
      const success = await deleteOffer(offer.id);
      if (success) {
        toast.success("Offre supprimée avec succès");
        navigateToAdmin('offers');
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression de l'offre");
    }
  };


  const handleAnalysisClick = (analysisType: 'internal' | 'leaser') => {
    console.log("🔍 ADMIN OFFER DETAIL - handleAnalysisClick called with:", analysisType);
    const stepKey = analysisType === 'internal' ? 'internal_review' : 'leaser_review';
    setScoringAnalysisType(analysisType);
    setScoringTargetStatus(stepKey);
    setScoringModalOpen(true);
  };

  const handleInternalScoring = async (score: 'A' | 'B' | 'C', reason?: string) => {
    // Pour le score C, ouvrir la modale d'email de refus
    if (score === 'C') {
      setRejectionReason(reason || "");
      setScoringModalOpen(false);
      setShowRejectionModal(true);
      return;
    }

    setScoringLoading(true);
    try {
      let newStatus = '';
      switch (score) {
        case 'A': newStatus = 'internal_approved'; break;
        case 'B': newStatus = 'internal_docs_requested'; break;
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
  // Pour le score C, ouvrir la modale d'email de refus
  if (score === 'C') {
    setRejectionReason(reason || "");
    setScoringModalOpen(false);
    setShowRejectionModal(true);
    return;
  }

  setScoringLoading(true);
  try {
    let newStatus = '';
    switch (score) {
      case 'A': newStatus = 'leaser_approved'; break;
      case 'B': newStatus = 'leaser_docs_requested'; break;
    }
    
    const success = await updateOfferStatus(
      offer.id,
      newStatus,
      offer.workflow_status,
      reason || `Score attribué: ${score}`
    );
    
    if (success) {
      setOffer({ ...offer, workflow_status: newStatus });
      if (score === 'A') {
        toast.success("Score A attribué. Préparation de l'email de validation…");
        setEmailModalReason("Validation de l'offre après approbation du leaser");
        setShowEmailModal(true);
      } else {
        toast.success(`Score ${score} attribué avec succès`);
      }
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

// Validation finale via modale email (Contrat prêt)
const handleSendEmailAndValidate = async (customContent?: string, includePdf: boolean = true) => {
  setScoringLoading(true);
  try {
    const success = await updateOfferStatus(
      offer.id,
      'offer_validation',
      offer.workflow_status,
      emailModalReason
    );
    if (!success) {
      toast.error("Erreur lors de la mise à jour du statut");
      return;
    }
    try {
      await sendLeasingAcceptanceEmail(offer.id, customContent, includePdf);
      toast.success("Email envoyé et offre validée avec succès");
    } catch (emailErr) {
      console.error("Erreur d'envoi email:", emailErr);
      toast.warning("Offre validée mais l'email n'a pas pu être envoyé");
    }
    await fetchOfferDetails();
    setShowEmailModal(false);
  } catch (err) {
    console.error("Erreur lors de la validation:", err);
    toast.error("Erreur lors de la validation");
  } finally {
    setScoringLoading(false);
  }
};

const handleValidateWithoutEmail = async () => {
  setScoringLoading(true);
  try {
    const success = await updateOfferStatus(
      offer.id,
      'offer_validation',
      offer.workflow_status,
      emailModalReason
    );
    if (success) {
      toast.success("Offre validée sans envoi d'email");
      await fetchOfferDetails();
      setShowEmailModal(false);
    } else {
      toast.error("Erreur lors de la mise à jour du statut");
    }
  } catch (err) {
    console.error("Erreur lors de la validation sans email:", err);
    toast.error("Erreur lors de la validation");
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
            <Button onClick={() => navigateToAdmin("offers")}>
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
                  onClick={() => navigateToAdmin("offers")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </Button>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold">
                        {offer.dossier_number || `Offre #${offer.id?.slice(0, 8)}`}
                      </h1>
                      <OfferReferenceEditor
                        offerId={offer.id}
                        currentReference={offer.dossier_number}
                        onUpdate={fetchOfferDetails}
                      />
                    </div>
                    {offer.type && <OfferTypeTag type={offer.type} size="md" />}
                  </div>
                  <p className="text-gray-600 font-medium">{offer.client_name}</p>
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
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="financial" className="text-xs sm:text-sm">Financier</TabsTrigger>
                    <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs sm:text-sm">Historique</TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs sm:text-sm">Notes</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4 mt-4 overflow-visible">
                    <ClientSection offer={offer} />
                    <NewEquipmentSection offer={offer} onOfferUpdate={() => { setEquipmentRefreshKey((k) => k + 1); fetchOfferDetails(); }} />
                  </TabsContent>
                  
                  <TabsContent value="financial" className="mt-4 overflow-visible">
                    <FinancialSection offer={offer} onOfferUpdated={fetchOfferDetails} refreshKey={equipmentRefreshKey} />
                  </TabsContent>
                  
                  <TabsContent value="documents" className="space-y-4 mt-4 overflow-visible">
                    <OfferDocuments offerId={offer.id} />
                  </TabsContent>
                  
                  <TabsContent value="history" className="space-y-4 mt-4 overflow-visible">
                    <ImprovedOfferHistory offerId={offer.id} />
                  </TabsContent>
                  
                  <TabsContent value="notes" className="space-y-4 mt-4 overflow-visible">
                    <div className="space-y-4">
                      <AmbassadorAddNoteCard 
                        offerId={offer.id} 
                        onNoteAdded={handleNoteAdded} 
                      />
                      <AmbassadorOfferNotes 
                        notes={offerNotes} 
                        loading={notesLoading} 
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar des actions compacte */}
              <div className="lg:col-span-1 space-y-4">
              <CompactActionsSidebar
                  offer={offer}
                  onEdit={handleEditOffer}
                  onGeneratePDF={handleGeneratePDF}
                  onSendEmail={() => setEmailDialogOpen(true)}
                  onOpenPublicLink={handleOpenPublicLink}
                  onDelete={handleDeleteOffer}
                  isGeneratingPDF={isGeneratingPDF}
                  onEditRequestDate={() => {
                    setDateEditorType('request');
                    setIsDateEditorOpen(true);
                  }}
                  onEditCreatedDate={() => {
                    setDateEditorType('created');
                    setIsDateEditorOpen(true);
                  }}
                  uploadLinks={uploadLinks}
                  onOpenUploadLink={handleOpenUploadLink}
                />
                
                {/* Configuration de l'offre */}
                <OfferEditConfiguration
                  offerId={offer.id}
                  currentSource={offer.source}
                  currentType={offer.type}
                  currentSector={offer.business_sector}
                  onUpdate={() => {
                    // Recharger les données de l'offre
                    const fetchOfferDetails = async () => {
                      try {
                        const offerData = await getOfferById(offer.id);
                        if (offerData) {
                          setOffer(offerData);
                        }
                      } catch (error) {
                        console.error("Erreur lors du rechargement:", error);
                      }
                    };
                    fetchOfferDetails();
                  }}
                />

                {/* Frais et assurance */}
                <OfferFinancialFeesEditor
                  offerId={offer.id}
                  currentFileFee={offer.file_fee}
                  currentAnnualInsurance={offer.annual_insurance}
                  totalMonthlyPayment={calculateTotalMonthlyPayment(offer)}
                  contractDuration={offer.contract_duration || 36}
                  onUpdate={fetchOfferDetails}
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
          onClose={() => {
            setScoringModalOpen(false);
            setScoringTargetStatus(null);
          }}
          offerId={offer.id}
          currentStatus={scoringTargetStatus || offer.workflow_status}
          analysisType={scoringAnalysisType}
          onScoreAssigned={scoringAnalysisType === 'internal' ? handleInternalScoring : handleLeaserScoring}
          isLoading={scoringLoading}
        />

        {/* Modale d'email de refus */}
        <RejectionEmailModal
          isOpen={showRejectionModal}
          onClose={() => setShowRejectionModal(false)}
          offerId={offer.id}
          offerData={offer}
          onSendEmailAndValidate={async (customTitle?: string, customContent?: string) => {
            try {
              // Envoyer l'email de refus
              await sendLeasingRejectionEmail(offer.id, customTitle, customContent);
              
              // Mettre à jour le statut selon l'analyse
              const newStatus = scoringAnalysisType === 'internal' ? 'internal_rejected' : 'leaser_rejected';
              const success = await updateOfferStatus(
                offer.id,
                newStatus,
                offer.workflow_status,
                rejectionReason
              );
              
              if (success) {
                setOffer({ ...offer, workflow_status: newStatus });
                toast.success("Email de refus envoyé et score C attribué");
                setShowRejectionModal(false);
                await fetchOfferDetails();
              }
            } catch (error) {
              console.error("Erreur lors de l'envoi du refus:", error);
              throw error;
            }
          }}
          onValidateWithoutEmail={async () => {
            try {
              // Mettre à jour le statut sans envoyer d'email
              const newStatus = scoringAnalysisType === 'internal' ? 'internal_rejected' : 'leaser_rejected';
              const success = await updateOfferStatus(
                offer.id,
                newStatus,
                offer.workflow_status,
                rejectionReason
              );
              
              if (success) {
                setOffer({ ...offer, workflow_status: newStatus });
                toast.success("Score C attribué sans envoi d'email");
                setShowRejectionModal(false);
                await fetchOfferDetails();
              }
            } catch (error) {
              console.error("Erreur lors de la validation:", error);
              throw error;
            }
          }}
        />

        {/* Éditeur de date */}
        <OfferDateEditor
          offerId={offer.id}
          currentDate={dateEditorType === 'created' ? offer.created_at : (offer.request_date || offer.created_at)}
          isOpen={isDateEditorOpen}
          onClose={() => setIsDateEditorOpen(false)}
          onDateUpdated={() => {
            fetchOfferDetails();
            setIsDateEditorOpen(false);
          }}
          dateType={dateEditorType}
        />

        {/* Modal de confirmation d'email */}
        <EmailConfirmationModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          offerId={offer.id}
          offerData={offer}
          onSendEmailAndValidate={handleSendEmailAndValidate}
          onValidateWithoutEmail={handleValidateWithoutEmail}
        />

        {/* Dialog d'envoi d'email */}
        <EmailOfferDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          offerId={offer.id}
          offerNumber={offer.offer_number || offer.dossier_number}
          clientEmail={offer.client_email}
          clientName={offer.client_name}
          validity={offer.content_blocks?.cover_validity}
        />
      </Container>
    </PageTransition>
  );
};

export default AdminOfferDetail;
