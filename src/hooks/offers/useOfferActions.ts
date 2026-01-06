// Hooks for offer actions including PDF generation
import React, { useState } from "react";
import { toast } from "sonner";
import { createRoot } from 'react-dom/client';
import CommercialOffer from '@/components/offers/CommercialOffer';
import { 
  deleteOffer, 
  updateOfferStatus, 
  sendInfoRequest, 
  processInfoResponse
} from "@/services/offerService";
import { Offer } from "./useFetchOffers";
import { sendOfferReadyEmail } from "@/services/emailService";
import { supabase } from "@/integrations/supabase/client";

export const useOfferActions = (offers: Offer[], setOffers: React.Dispatch<React.SetStateAction<Offer[]>>) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRequestingInfo, setIsRequestingInfo] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      const success = await deleteOffer(id);
      
      if (success) {
        setOffers(prevOffers => prevOffers.filter(offer => offer.id !== id));
        toast.success("Offre supprimée avec succès");
      } else {
        toast.error("Erreur lors de la suppression de l'offre");
      }
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Erreur lors de la suppression de l'offre");
    }
  };
  
  const handleUpdateWorkflowStatus = async (offerId: string, newStatus: string, reason?: string) => {
    try {
      setIsUpdatingStatus(true);
      
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error("Offre non trouvée");
      
      const success = await updateOfferStatus(
        offerId, 
        newStatus, 
        offer.workflow_status,
        reason
      );
      
      if (success) {
        setOffers(prevOffers => prevOffers.map(o => 
          o.id === offerId ? { ...o, workflow_status: newStatus } : o
        ));
        toast.success(`Statut mis à jour avec succès`);
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("Error updating offer status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleResendOffer = async (id: string) => {
    try {
      setIsSendingEmail(true);
      const offer = offers.find(o => o.id === id);
      if (!offer) throw new Error("Offre non trouvée");
      
      console.log("🚀 DÉBUT PROCESSUS ENVOI EMAIL");
      console.log("📋 Détails de l'offre:", {
        id: offer.id,
        client_name: offer.client_name,
        client_email: offer.client_email,
        workflow_status: offer.workflow_status
      });
      
      // Construire le lien de signature côté client
      const offerLink = `${window.location.origin}/client/offer/${offer.id}/sign`;
      console.log("🔗 Lien de signature généré:", offerLink);
      
      // Formatter la description de l'équipement si nécessaire
      let equipmentDescription = offer.equipment_description || "Votre équipement";
      
      // Vérifier si la description est un JSON et le formater proprement
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
        // En cas d'erreur, conserver la description originale
      }
      
      console.log("📦 Description équipement formatée:", equipmentDescription);
      console.log("💰 Données financières:", {
        amount: offer.amount || 0,
        monthlyPayment: Number(offer.monthly_payment) || 0
      });
      
      // Mettre à jour le statut de l'offre si nécessaire
      if (offer.workflow_status === 'draft') {
        console.log("📝 Mise à jour du statut de brouillon vers envoyé");
        await handleUpdateWorkflowStatus(id, 'sent', 'Offre envoyée au client');
      }
      
      // Envoyer l'email "offre prête à consulter"
      console.log("📧 Tentative d'envoi de l'email avec sendOfferReadyEmail");
      const success = await sendOfferReadyEmail(
        offer.client_email,
        offer.client_name,
        {
          id: offer.id,
          description: equipmentDescription,
          amount: typeof offer.amount === 'string' ? Number(offer.amount) : (offer.amount || 0),
          monthlyPayment: Number(offer.monthly_payment || 0)
        },
        offerLink // Passer le lien en paramètre
      );
      
      if (success) {
        console.log("✅ Email envoyé avec succès");
        toast.success("L'offre a été envoyée au client avec succès");
      } else {
        console.error("❌ Échec de l'envoi de l'email");
        console.error("Vérifiez les logs de la fonction edge send-resend-email");
        toast.error("Erreur lors de l'envoi de l'offre par email. Vérifiez la configuration email.");
      }
    } catch (error) {
      console.error("💥 Erreur générale lors de l'envoi de l'offre:", error);
      toast.error("Erreur lors de l'envoi de l'offre");
    } finally {
      setIsSendingEmail(false);
    }
  };
  
  const handleGenerateOffer = async (id: string): Promise<void> => {
    const toastId = toast.loading('Préparation du PDF...');
    
    try {
      // 1. Récupérer les données de l'offre
      const offer = offers.find(o => o.id === id);
      if (!offer) {
        toast.error("Offre introuvable", { id: toastId });
        return;
      }

      // Récupérer les équipements depuis la base de données
      const { getOfferEquipment } = await import('@/services/offers/offerEquipment');
      const equipmentData = await getOfferEquipment(id);

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
          offerId: id, 
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

      // Préparer les données COMPLÈTES pour CommercialOffer
      const isPurchase = (offer as any)?.is_purchase === true;
      
      // Calculer le total prix de vente pour le mode achat
      // selling_price en DB est le prix UNITAIRE, donc on multiplie par quantity
      // Priorité : financed_amount (source de vérité) sinon calcul depuis équipements
      const totalSellingPriceFromEquipment = equipmentData.reduce(
        (sum: number, eq: any) => sum + ((Number(eq.selling_price) || 0) * (Number(eq.quantity) || 1)),
        0
      );
      const totalSellingPrice = isPurchase && (offer as any).financed_amount 
        ? Number((offer as any).financed_amount) 
        : totalSellingPriceFromEquipment;
      
      // Calculer l'acompte et la mensualité ajustée
      const downPayment = Number((offer as any).down_payment) || 0;
      const coefficient = Number(offer.coefficient) || 0;
      const originalMonthlyPayment = Number(offer.monthly_payment) || 0;

      // Calculer le montant de base financé
      const baseFinancedAmount = totalSellingPrice > 0 
        ? totalSellingPrice 
        : (coefficient > 0 && originalMonthlyPayment > 0 
            ? (originalMonthlyPayment * 100) / coefficient 
            : Number(offer.financed_amount) || Number(offer.amount) || 0);

      // Calculer le montant financé après acompte
      const financedAmountAfterDownPayment = Math.max(0, baseFinancedAmount - downPayment);

      // Calculer la mensualité ajustée
      const adjustedMonthlyPayment = downPayment > 0 && coefficient > 0
        ? Math.round((financedAmountAfterDownPayment * coefficient) / 100 * 100) / 100
        : originalMonthlyPayment;
      
      const offerDataForPDF = {
        // Données de base
        offerNumber: offer.dossier_number || `OFF-${Date.now().toString().slice(-6)}`,
        offerDate: offer.created_at ? new Date(offer.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'),
        clientName: offer.client_name || 'Client',
        clientEmail: offer.client_email || clientData?.email || '',
        clientPhone: clientData?.phone || '',
        clientCompany: (offer as any).client_company || '',
        clientAddress: billingAddress,
        companyLogo: companyLogoBase64,
        companyName: companyData?.name || 'iTakecare',
        showPrintButton: false,
        isPDFMode: true,
        isPurchase: isPurchase,
        
        // Équipements - Convertir le format DB vers le format CommercialOffer
        equipment: equipmentData.map((eq: any) => ({
          id: eq.id,
          title: eq.title,
          quantity: eq.quantity || 1,
          monthlyPayment: eq.monthly_payment || 0,
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
        
        // Totaux et informations financières
        totalMonthly: isPurchase ? 0 : originalMonthlyPayment,
        totalSellingPrice: totalSellingPrice,
        contractDuration: Number(offer.duration) || 36,
        fileFee: isPurchase ? 0 : Number(offer.file_fee) || 0,
        insuranceCost: isPurchase ? 0 : Number(offer.annual_insurance) || 0,
        
        // Acompte et mensualité ajustée
        downPayment: downPayment,
        adjustedMonthlyPayment: adjustedMonthlyPayment,
        financedAmountAfterDownPayment: financedAmountAfterDownPayment,
        
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
            // Introduction adaptée selon le mode achat ou leasing
            introduction: isPurchase 
              ? (contentBlocksMap['cover']?.['introduction_purchase'] || '<p>Nous avons le plaisir de vous présenter notre offre d\'achat sur mesure, conçue pour accompagner la croissance de votre entreprise.</p>')
              : (contentBlocksMap['cover']?.['introduction'] || '<p>Nous avons le plaisir de vous présenter notre offre de leasing tech premium, conçue pour accompagner la croissance de votre entreprise.</p>'),
            validity: contentBlocksMap['cover']?.['validity'] || '<p>Cette offre est valable 30 jours.</p>',
          },
          equipment: {
            title: contentBlocksMap['equipment']?.['title'] || 'Détail de l\'équipement',
            footer_note: contentBlocksMap['equipment']?.['footer_note'] || 'Tous nos équipements sont garantis.',
          },
          conditions: {
            general_conditions: contentBlocksMap['conditions']?.['general_conditions'] || '<h3>Conditions générales</h3>',
            sale_general_conditions: contentBlocksMap['conditions']?.['sale_general_conditions'] || '<h3>Conditions de vente</h3>',
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
      // Délai supplémentaire pour s'assurer que TOUT est prêt
      await new Promise(resolve => setTimeout(resolve, 800));

      // 4b. Activer le mode PDF (remplace gradients par couleurs solides)
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
          React.createElement(CommercialOffer, offerDataForPDF)
        )
      );

      // 5. Attendre que TOUT soit chargé (polices, images, styles)
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
      // Import dynamiques pour éviter les problèmes de compilation
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
        
        // Convertir la page en canvas (image haute qualité)
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

        // Convertir le canvas en image JPEG
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // Ajouter une nouvelle page au PDF (sauf pour la première)
        if (i > 0) {
          pdf.addPage();
        }
        
        // Ajouter l'image au PDF (dimensions A4 en mm)
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      // 9. Télécharger le PDF
      const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      const clientNameForFile = (offer.client_company || offer.client_name || offerDataForPDF.clientName || 'Client')
        .replace(/[^a-zA-Z0-9\s]/g, '')  // Enlève les caractères spéciaux
        .replace(/\s+/g, '_')             // Remplace espaces par underscore
        .substring(0, 30);                // Limite à 30 caractères
      const filename = `Offre_${offerDataForPDF.offerNumber}_${clientNameForFile}_${date}.pdf`;
      pdf.save(filename);

      // 9b. Retirer le mode PDF
      container.classList.remove('pdf-mode');

      // 10. Nettoyage : supprimer le conteneur du DOM
      root.unmount();
      document.body.removeChild(container);

      // 11. Notification de succès
      toast.success(`✅ PDF téléchargé : ${filename}`, { id: toastId });
      console.log(`✅ PDF généré avec succès: ${filename}`);

    } catch (error) {
      console.error('❌ Erreur complète:', error);
      toast.error(`Erreur: ${(error as Error).message}`, { id: toastId });
    }
  };
  
  const handleRequestInfo = async (offerId: string, requestedDocs: string[], customMessage: string) => {
    try {
      setIsRequestingInfo(true);
      
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error("Offre non trouvée");
      
      console.log("Demande d'informations pour l'offre:", offerId);
      console.log("Documents demandés:", requestedDocs);
      console.log("Message personnalisé:", customMessage);
      
      const data = {
        offerId,
        requestedDocs,
        customMessage,
        previousStatus: offer.workflow_status
      };
      
      const success = await sendInfoRequest(data);
      
      if (success) {
        setOffers(prevOffers => prevOffers.map(o => 
          o.id === offerId ? { ...o, workflow_status: 'info_requested' } : o
        ));
        toast.success("Demande d'informations envoyée avec succès");
      } else {
        toast.error("Erreur lors de l'envoi de la demande");
      }
    } catch (error) {
      console.error("Error requesting information:", error);
      toast.error("Erreur lors de la demande d'informations");
    } finally {
      setIsRequestingInfo(false);
    }
  };
  
  const handleProcessInfoResponse = async (offerId: string, approve: boolean) => {
    try {
      setIsUpdatingStatus(true);
      
      const success = await processInfoResponse(offerId, approve);
      
      if (success) {
        const newStatus = approve ? 'leaser_review' : 'rejected';
        
        setOffers(prevOffers => prevOffers.map(o => 
          o.id === offerId ? { ...o, workflow_status: newStatus } : o
        ));
        
        toast.success(approve 
          ? "L'offre a été approuvée et envoyée au bailleur" 
          : "L'offre a été rejetée"
        );
      } else {
        toast.error("Erreur lors du traitement de la réponse");
      }
    } catch (error) {
      console.error("Error processing info response:", error);
      toast.error("Erreur lors du traitement de la réponse");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleInternalScoring = async (offerId: string, score: 'A' | 'B' | 'C', reason?: string) => {
    try {
      setIsUpdatingStatus(true);
      
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error("Offre non trouvée");
      
      let newStatus: string;
      let statusReason: string;
      
      switch (score) {
        case 'A':
          newStatus = 'internal_approved';
          statusReason = `Analyse interne - Score A (Approuvé)${reason ? `: ${reason}` : ''}`;
          break;
        case 'B':
          newStatus = 'internal_docs_requested';
          statusReason = `Analyse interne - Score B (Documents requis): ${reason}`;
          break;
        case 'C':
          newStatus = 'internal_rejected';
          statusReason = `Analyse interne - Score C (Refusé): ${reason}`;
          break;
      }
      
      const success = await updateOfferStatus(offerId, newStatus, offer.workflow_status, statusReason);
      
      if (success) {
        setOffers(prevOffers => prevOffers.map(o => 
          o.id === offerId ? { ...o, workflow_status: newStatus } : o
        ));
        toast.success(`Score ${score} attribué avec succès`);
      } else {
        toast.error("Erreur lors de l'attribution du score");
      }
    } catch (error) {
      console.error("Error scoring offer internally:", error);
      toast.error("Erreur lors de l'attribution du score");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleLeaserScoring = async (offerId: string, score: 'A' | 'B' | 'C', reason?: string) => {
    try {
      setIsUpdatingStatus(true);
      
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error("Offre non trouvée");
      
      let newStatus: string;
      let statusReason: string;
      
      switch (score) {
        case 'A':
          // Étape 1: Passer à leaser_approved
          newStatus = 'leaser_approved';
          statusReason = `Analyse Leaser - Score A (Approuvé)${reason ? `: ${reason}` : ''}`;
          
          // Mettre à jour vers leaser_approved
          const stepOneSuccess = await updateOfferStatus(offerId, newStatus, offer.workflow_status, statusReason);
          
          if (stepOneSuccess) {
            // Étape 2: Transition automatique vers validated (Contrat prêt)
            const { error: validatedError } = await supabase
              .from('offers')
              .update({ 
                workflow_status: 'validated',
                status: 'accepted' // Mettre le status général à accepted
              })
              .eq('id', offerId);
            
            if (!validatedError) {
              // Logger la transition vers validated
              await supabase
                .from('offer_workflow_logs')
                .insert({
                  offer_id: offerId,
                  user_id: (await supabase.auth.getUser()).data.user?.id,
                  previous_status: 'leaser_approved',
                  new_status: 'validated',
                  reason: 'Transition automatique après approbation leaser - Contrat prêt'
                });
              
              setOffers(prevOffers => prevOffers.map(o => 
                o.id === offerId ? { 
                  ...o, 
                  workflow_status: 'validated',
                  status: 'accepted'
                } : o
              ));
              toast.success(`Score ${score} attribué - Contrat prêt à être envoyé`);
            } else {
              console.error("Erreur lors de la transition vers validated:", validatedError);
              toast.error("Erreur lors de la transition vers Contrat prêt");
            }
          } else {
            toast.error("Erreur lors de l'attribution du score");
          }
          return;
          
        case 'B':
          newStatus = 'leaser_docs_requested';
          statusReason = `Analyse Leaser - Score B (Documents requis): ${reason}`;
          break;
        case 'C':
          newStatus = 'leaser_rejected';
          statusReason = `Analyse Leaser - Score C (Refusé): ${reason}`;
          break;
      }
      
      const success = await updateOfferStatus(offerId, newStatus, offer.workflow_status, statusReason);
      
      if (success) {
        setOffers(prevOffers => prevOffers.map(o => 
          o.id === offerId ? { ...o, workflow_status: newStatus } : o
        ));
        toast.success(`Score ${score} attribué avec succès`);
      } else {
        toast.error("Erreur lors de l'attribution du score");
      }
    } catch (error) {
      console.error("Error scoring offer by leaser:", error);
      toast.error("Erreur lors de l'attribution du score");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    isUpdatingStatus,
    isRequestingInfo,
    isGeneratingPdf,
    isSendingEmail,
    handleDeleteOffer,
    handleUpdateWorkflowStatus,
    handleResendOffer,
    handleGenerateOffer,
    handleRequestInfo,
    handleProcessInfoResponse,
    handleInternalScoring,
    handleLeaserScoring
  };
};
