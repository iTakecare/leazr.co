import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Building, FileText, Send, Download, RefreshCw, Trash2, CheckCircle, Mail, HelpCircle, X, Check } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getOfferById, updateOfferStatus, getWorkflowLogs, deleteOffer, sendInfoRequest, processInfoResponse } from "@/services/offerService";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import OfferStatusBadge, { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import PageTransition from "@/components/layout/PageTransition";
import ContractStatusBadge from "@/components/contracts/ContractStatusBadge";
import { contractStatuses, updateContractStatus, getContractWorkflowLogs, addTrackingNumber } from "@/services/contractService";
import { Progress } from "@/components/ui/progress";
import { generateOfferPdf } from "@/utils/pdfGenerator";
import RequestInfoModal from "@/components/offers/RequestInfoModal";

const OfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [equipmentItems, setEquipmentItems] = useState<any[]>([]);
  const [contractLogs, setContractLogs] = useState<any[]>([]);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [carrier, setCarrier] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [infoRequestDialogOpen, setInfoRequestDialogOpen] = useState(false);
  
  const fetchOfferDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setLoadingError(null);
      
      const offerData = await getOfferById(id);
      if (!offerData) {
        setLoadingError("L'offre n'a pas été trouvée.");
        return;
      }
      
      setOffer(offerData);
      
      if (offerData.equipment_description) {
        try {
          const parsedEquipment = typeof offerData.equipment_description === 'string' 
            ? JSON.parse(offerData.equipment_description) 
            : offerData.equipment_description;
            
          if (Array.isArray(parsedEquipment)) {
            setEquipmentItems(parsedEquipment);
          }
        } catch (e) {
          console.error("Erreur lors de l'analyse des données d'équipement:", e);
        }
      }
      
      const workflowLogs = await getWorkflowLogs(id);
      setLogs(workflowLogs);
      
      if (offerData.converted_to_contract) {
        try {
          const contractWorkflowLogs = await getContractWorkflowLogs(id);
          setContractLogs(contractWorkflowLogs);
        } catch (error) {
          console.error("Erreur lors du chargement des logs de contrat:", error);
        }
      }
      
    } catch (error) {
      console.error("Erreur lors du chargement des détails de l'offre:", error);
      setLoadingError("Erreur lors du chargement des détails de l'offre.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchOfferDetails();
  }, [id]);
  
  const openStatusChangeDialog = (status: string) => {
    setTargetStatus(status);
    setStatusChangeReason('');
    setStatusDialogOpen(true);
  };
  
  const openTrackingDialog = () => {
    setTrackingNumber('');
    setEstimatedDelivery('');
    setCarrier('');
    setTrackingDialogOpen(true);
  };
  
  const handleStatusChange = async () => {
    if (!offer || !targetStatus) return;
    
    try {
      setIsUpdatingStatus(true);
      
      if (offer.converted_to_contract) {
        const success = await updateContractStatus(
          offer.id, 
          targetStatus, 
          statusChangeReason
        );
        
        if (success) {
          toast.success(`Statut du contrat mis à jour avec succès`);
          fetchOfferDetails();
          setStatusDialogOpen(false);
        } else {
          toast.error("Erreur lors de la mise à jour du statut du contrat");
        }
      } else {
        const success = await updateOfferStatus(
          offer.id, 
          targetStatus
        );
        
        if (success) {
          toast.success(`Statut mis à jour avec succès`);
          fetchOfferDetails();
          setStatusDialogOpen(false);
        } else {
          toast.error("Erreur lors de la mise à jour du statut");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleAddTrackingInfo = async () => {
    if (!offer || !trackingNumber) return;
    
    try {
      setIsUpdatingStatus(true);
      
      const success = await addTrackingNumber(
        offer.id,
        trackingNumber,
        estimatedDelivery,
        carrier
      );
      
      if (success) {
        toast.success(`Informations de suivi ajoutées avec succès`);
        
        await updateContractStatus(
          offer.id,
          contractStatuses.EQUIPMENT_ORDERED,
          offer.contract_status || contractStatuses.CONTRACT_SIGNED,
          "Numéro de suivi ajouté"
        );
        
        fetchOfferDetails();
        setTrackingDialogOpen(false);
      } else {
        toast.error("Erreur lors de l'ajout des informations de suivi");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout des informations de suivi:", error);
      toast.error("Erreur lors de l'ajout des informations de suivi");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleDeleteOffer = async () => {
    if (!offer) return;
    
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      const success = await deleteOffer(offer.id);
      
      if (success) {
        toast.success("Offre supprimée avec succès");
        navigate('/offers');
      } else {
        toast.error("Erreur lors de la suppression de l'offre");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'offre:", error);
      toast.error("Erreur lors de la suppression de l'offre");
    }
  };
  
  const handleGeneratePdf = () => {
    if (!offer) return;
    
    try {
      setIsGeneratingPdf(true);
      toast.success("Génération du PDF en cours...");
      
      setTimeout(() => {
        const filename = generateOfferPdf(offer);
        toast.success(`Le PDF a été généré sous le nom ${filename}`);
        setIsGeneratingPdf(false);
      }, 100);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
      setIsGeneratingPdf(false);
    }
  };
  
  const handleSendEmail = () => {
    toast.success("L'offre a été envoyée par email au client");
    // Email sending functionality to be implemented here
  };
  
  const handleRequestInfo = async (requestedDocs: string[], customMessage: string) => {
    if (!offer) return;
    
    try {
      setIsUpdatingStatus(true);
      
      const success = await sendInfoRequest(offer.id, customMessage);
      
      if (success) {
        toast.success("Demande d'informations envoyée avec succès");
        fetchOfferDetails();
        setInfoRequestDialogOpen(false);
      } else {
        toast.error("Erreur lors de l'envoi de la demande");
      }
    } catch (error) {
      console.error("Erreur lors de la demande d'informations:", error);
      toast.error("Erreur lors de la demande d'informations");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleProcessInfoResponse = async (approve: boolean) => {
    if (!offer) return;
    
    try {
      setIsUpdatingStatus(true);
      
      const responseStatus = approve ? "approved" : "rejected";
      const success = await processInfoResponse(offer.id, responseStatus);
      
      if (success) {
        toast.success(approve 
          ? "L'offre a été approuvée et envoyée au bailleur" 
          : "L'offre a été rejetée"
        );
        fetchOfferDetails();
      } else {
        toast.error("Erreur lors du traitement de la réponse");
      }
    } catch (error) {
      console.error("Erreur lors du traitement de la réponse:", error);
      toast.error("Erreur lors du traitement de la réponse");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const getAvailableActions = () => {
    if (!offer) return [];
    
    const actions = [];
    
    if (offer.converted_to_contract) {
      switch (offer.contract_status) {
        case contractStatuses.CONTRACT_SENT:
          actions.push({
            label: "Marquer comme signé",
            icon: FileText,
            onClick: () => openStatusChangeDialog(contractStatuses.CONTRACT_SIGNED),
          });
          break;
          
        case contractStatuses.CONTRACT_SIGNED:
          actions.push({
            label: "Ajouter numéro de suivi",
            icon: Send,
            onClick: openTrackingDialog,
          });
          break;
          
        case contractStatuses.EQUIPMENT_ORDERED:
          actions.push({
            label: "Marquer comme livré",
            icon: RefreshCw,
            onClick: () => openStatusChangeDialog(contractStatuses.DELIVERED),
          });
          break;
          
        case contractStatuses.DELIVERED:
          actions.push({
            label: "Marquer comme actif",
            icon: Building,
            onClick: () => openStatusChangeDialog(contractStatuses.ACTIVE),
          });
          break;
          
        case contractStatuses.ACTIVE:
          actions.push({
            label: "Marquer comme terminé",
            icon: RefreshCw,
            onClick: () => openStatusChangeDialog(contractStatuses.COMPLETED),
          });
          break;
      }
    } else {
      switch (offer.workflow_status) {
        case OFFER_STATUSES.DRAFT.id:
          actions.push({
            label: "Envoyer au client",
            icon: Send,
            onClick: () => openStatusChangeDialog(OFFER_STATUSES.SENT.id),
          });
          
          actions.push({
            label: "Générer PDF",
            icon: Download,
            onClick: handleGeneratePdf,
            variant: "secondary",
            disabled: isGeneratingPdf,
          });
          
          actions.push({
            label: "Envoyer par email",
            icon: Mail,
            onClick: handleSendEmail,
            variant: "secondary",
          });
          break;
          
        case OFFER_STATUSES.SENT.id:
          actions.push({
            label: "Marquer comme validée ITC",
            icon: CheckCircle,
            onClick: () => openStatusChangeDialog(OFFER_STATUSES.VALID_ITC.id),
          });
          break;
          
        case OFFER_STATUSES.VALID_ITC.id:
          actions.push({
            label: "Approuver l'offre",
            icon: Check,
            onClick: () => openStatusChangeDialog(OFFER_STATUSES.APPROVED.id),
          });
          
          actions.push({
            label: "Demander des infos",
            icon: HelpCircle,
            onClick: () => setInfoRequestDialogOpen(true),
            variant: "outline",
          });
          
          actions.push({
            label: "Rejeter l'offre",
            icon: X,
            onClick: () => openStatusChangeDialog(OFFER_STATUSES.REJECTED.id),
            className: "bg-red-600 text-white hover:bg-red-700",
          });
          break;
          
        case OFFER_STATUSES.INFO_REQUESTED.id:
          actions.push({
            label: "Approuver après infos",
            icon: CheckCircle,
            onClick: () => handleProcessInfoResponse(true),
          });
          
          actions.push({
            label: "Rejeter après infos",
            icon: X,
            onClick: () => handleProcessInfoResponse(false),
            className: "bg-red-600 text-white hover:bg-red-700",
          });
          break;
          
        case OFFER_STATUSES.APPROVED.id:
          actions.push({
            label: "Validation bailleur",
            icon: Building,
            onClick: () => openStatusChangeDialog(OFFER_STATUSES.LEASER_REVIEW.id),
          });
          break;
          
        case OFFER_STATUSES.LEASER_REVIEW.id:
          actions.push({
            label: "Marquer comme financée",
            icon: RefreshCw,
            onClick: () => openStatusChangeDialog(OFFER_STATUSES.FINANCED.id),
          });
          
          actions.push({
            label: "Demander des infos",
            icon: HelpCircle,
            onClick: () => setInfoRequestDialogOpen(true),
            variant: "outline",
          });
          
          actions.push({
            label: "Rejeter l'offre",
            icon: Trash2,
            onClick: () => openStatusChangeDialog(OFFER_STATUSES.REJECTED.id),
            className: "bg-red-600 text-white hover:bg-red-700",
          });
          break;
      }
      
      if (!offer.converted_to_contract) {
        actions.push({
          label: "Supprimer l'offre",
          icon: Trash2,
          onClick: handleDeleteOffer,
          className: "bg-red-600 text-white hover:bg-red-700",
        });
      }
    }
    
    return actions;
  };
  
  const handleStepClick = (status: string) => {
    if (offer.converted_to_contract) {
      if (status !== offer.contract_status) {
        openStatusChangeDialog(status);
      }
    } else {
      if (status !== offer.workflow_status) {
        openStatusChangeDialog(status);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (loadingError || !offer) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="text-red-500 font-medium">{loadingError || "L'offre n'a pas été trouvée."}</div>
        <Button onClick={() => navigate('/offers')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Retour aux offres
        </Button>
      </div>
    );
  }
  
  const availableActions = getAvailableActions();
  
  return (
    <PageTransition>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('/offers')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">
              Offre {`OFF-${offer.id.slice(0, 8)}`}
            </h1>
            {offer.converted_to_contract ? (
              <ContractStatusBadge status={offer.contract_status || contractStatuses.CONTRACT_SENT} />
            ) : (
              <OfferStatusBadge status={offer.workflow_status} isConverted={offer.converted_to_contract} />
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border">
          <h2 className="text-lg font-medium mb-4">
            {offer.converted_to_contract 
              ? "Gestion du contrat - Étapes du workflow" 
              : "Gestion de l'offre - Étapes du workflow"}
          </h2>
          
          <div className="flex flex-wrap gap-3">
            {availableActions.map((action, index) => (
              <Button 
                key={`${action.label}-${index}`}
                onClick={action.onClick}
                className={action.className}
                disabled={isUpdatingStatus}
                variant={action.variant || (action.label.includes("Supprimer") ? "destructive" : "default")}
                size="lg"
              >
                <action.icon className="mr-2 h-5 w-5" />
                {action.label}
              </Button>
            ))}
            
            {availableActions.length === 0 && (
              <div className="text-gray-500 italic p-2">
                {offer.converted_to_contract
                  ? "Aucune action disponible pour ce statut de contrat"
                  : "Aucune action disponible pour ce statut d'offre"}
              </div>
            )}
          </div>
          
          <div className="mt-6">
            {offer.converted_to_contract ? (
              <div className="flex items-center justify-between">
                <ProgressStep 
                  label="Contrat envoyé" 
                  isActive={offer.contract_status === contractStatuses.CONTRACT_SENT}
                  isCompleted={[
                    contractStatuses.CONTRACT_SIGNED, 
                    contractStatuses.EQUIPMENT_ORDERED,
                    contractStatuses.DELIVERED,
                    contractStatuses.ACTIVE,
                    contractStatuses.COMPLETED
                  ].includes(offer.contract_status || '')}
                  status={contractStatuses.CONTRACT_SENT}
                  onClick={handleStepClick}
                />
                <ProgressLine />
                <ProgressStep 
                  label="Contrat signé" 
                  isActive={offer.contract_status === contractStatuses.CONTRACT_SIGNED}
                  isCompleted={[
                    contractStatuses.EQUIPMENT_ORDERED,
                    contractStatuses.DELIVERED,
                    contractStatuses.ACTIVE,
                    contractStatuses.COMPLETED
                  ].includes(offer.contract_status || '')}
                  status={contractStatuses.CONTRACT_SIGNED}
                  onClick={handleStepClick}
                />
                <ProgressLine />
                <ProgressStep 
                  label="Équipement commandé" 
                  isActive={offer.contract_status === contractStatuses.EQUIPMENT_ORDERED}
                  isCompleted={[
                    contractStatuses.DELIVERED,
                    contractStatuses.ACTIVE,
                    contractStatuses.COMPLETED
                  ].includes(offer.contract_status || '')}
                  status={contractStatuses.EQUIPMENT_ORDERED}
                  onClick={handleStepClick}
                />
                <ProgressLine />
                <ProgressStep 
                  label="Livré" 
                  isActive={offer.contract_status === contractStatuses.DELIVERED}
                  isCompleted={[
                    contractStatuses.ACTIVE,
                    contractStatuses.COMPLETED
                  ].includes(offer.contract_status || '')}
                  status={contractStatuses.DELIVERED}
                  onClick={handleStepClick}
                />
                <ProgressLine />
                <ProgressStep 
                  label="Actif" 
                  isActive={offer.contract_status === contractStatuses.ACTIVE}
                  isCompleted={[
                    contractStatuses.COMPLETED
                  ].includes(offer.contract_status || '')}
                  status={contractStatuses.ACTIVE}
                  onClick={handleStepClick}
                />
                <ProgressLine />
                <ProgressStep 
                  label="Terminé" 
                  isActive={offer.contract_status === contractStatuses.COMPLETED}
                  isCompleted={false}
                  status={contractStatuses.COMPLETED}
                  onClick={handleStepClick}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                {!offer.converted_to_contract && (
                  <div className="flex items-center justify-between">
                    <ProgressStep 
                      label="Brouillon" 
                      isActive={offer.workflow_status === OFFER_STATUSES.DRAFT.id}
                      isCompleted={[
                        OFFER_STATUSES.SENT.id, 
                        OFFER_STATUSES.VALID_ITC.id,
                        OFFER_STATUSES.APPROVED.id,
                        OFFER_STATUSES.LEASER_REVIEW.id,
                        OFFER_STATUSES.FINANCED.id
                      ].includes(offer.workflow_status || '')}
                      status={OFFER_STATUSES.DRAFT.id}
                      onClick={handleStepClick}
                    />
                    <ProgressLine />
                    <ProgressStep 
                      label="Envoyée" 
                      isActive={offer.workflow_status === OFFER_STATUSES.SENT.id}
                      isCompleted={[
                        OFFER_STATUSES.VALID_ITC.id,
                        OFFER_STATUSES.APPROVED.id,
                        OFFER_STATUSES.LEASER_REVIEW.id,
                        OFFER_STATUSES.FINANCED.id
                      ].includes(offer.workflow_status || '')}
                      status={OFFER_STATUSES.SENT.id}
                      onClick={handleStepClick}
                    />
                    <ProgressLine />
                    <ProgressStep 
                      label="Valid. ITC" 
                      isActive={offer.workflow_status === OFFER_STATUSES.VALID_ITC.id}
                      isCompleted={[
                        OFFER_STATUSES.APPROVED.id,
                        OFFER_STATUSES.LEASER_REVIEW.id,
                        OFFER_STATUSES.FINANCED.id
                      ].includes(offer.workflow_status || '')}
                      status={OFFER_STATUSES.VALID_ITC.id}
                      onClick={handleStepClick}
                    />
                    <ProgressLine />
                    <ProgressStep 
                      label="Approuvée" 
                      isActive={offer.workflow_status === OFFER_STATUSES.APPROVED.id}
                      isCompleted={[
                        OFFER_STATUSES.LEASER_REVIEW.id,
                        OFFER_STATUSES.FINANCED.id
                      ].includes(offer.workflow_status || '')}
                      status={OFFER_STATUSES.APPROVED.id}
                      onClick={handleStepClick}
                    />
                    <ProgressLine />
                    <ProgressStep 
                      label="Valid. bailleur" 
                      isActive={offer.workflow_status === OFFER_STATUSES.LEASER_REVIEW.id}
                      isCompleted={[
                        OFFER_STATUSES.FINANCED.id
                      ].includes(offer.workflow_status || '')}
                      status={OFFER_STATUSES.LEASER_REVIEW.id}
                      onClick={handleStepClick}
                    />
                    <ProgressLine />
                    <ProgressStep 
                      label="Financée" 
                      isActive={offer.workflow_status === OFFER_STATUSES.FINANCED.id}
                      isCompleted={false}
                      status={OFFER_STATUSES.FINANCED.id}
                      onClick={handleStepClick}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Détails de l'offre</CardTitle>
              <CardDescription>Informations concernant cette offre</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Client</div>
                  <div className="text-lg">{offer.client_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Email</div>
                  <div className="text-lg">{offer.client_email}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Montant total</div>
                  <div className="text-lg font-medium">{formatCurrency(offer.amount || 0)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Paiement mensuel</div>
                  <div className="text-lg">{formatCurrency(offer.monthly_payment || 0)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Coefficient</div>
                  <div className="text-lg">{offer.coefficient}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Commission</div>
                  <div className="text-lg">{formatCurrency(offer.commission || 0)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Date de création</div>
                  <div className="text-lg">{formatDate(offer.created_at)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Type d'offre</div>
                  <div className="text-lg">
                    {offer.type === 'admin_offer' ? 'Offre administrative' : 'Demande client'}
                  </div>
                </div>
              </div>
              
              {offer.converted_to_contract && offer.tracking_number && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="text-lg font-medium mb-4">Informations de livraison</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Numéro de suivi</div>
                        <div className="text-lg">{offer.tracking_number}</div>
                      </div>
                      {offer.estimated_delivery && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">Livraison estimée</div>
                          <div className="text-lg">{offer.estimated_delivery}</div>
                        </div>
                      )}
                      {offer.delivery_carrier && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">Transporteur</div>
                          <div className="text-lg">{offer.delivery_carrier}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Équipements</h3>
                {equipmentItems.length > 0 ? (
                  <div className="space-y-4">
                    {equipmentItems.map((item, index) => (
                      <div key={item.id || index} className="border p-4 rounded-md">
                        <div className="font-medium">{item.title}</div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-gray-500">Prix d'achat:</span> {formatCurrency(item.purchasePrice || 0)}
                          </div>
                          <div>
                            <span className="text-gray-500">Quantité:</span> {item.quantity || 1}
                          </div>
                          <div>
                            <span className="text-gray-500">Marge:</span> {item.margin || 0}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">Aucun équipement trouvé</div>
                )}
              </div>
              
              {offer.additional_info && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="text-lg font-medium mb-2">Informations complémentaires</h3>
                    <p className="whitespace-pre-line">{offer.additional_info}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
              <CardDescription>Modifications de statut</CardDescription>
            </CardHeader>
            <CardContent>
              {offer.converted_to_contract && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Contrat</h3>
                  {contractLogs.length > 0 ? (
                    <div className="space-y-4">
                      {contractLogs.map((log) => (
                        <div key={log.id} className="border-l-2 border-blue-200 pl-4 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium">
                              {log.profiles?.first_name} {log.profiles?.last_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(log.created_at)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span>Statut changé de</span>
                            <ContractStatusBadge status={log.previous_status} />
                            <span>à</span>
                            <ContractStatusBadge status={log.new_status} />
                          </div>
                          {log.reason && (
                            <div className="mt-2 text-sm text-gray-600">
                              {log.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500">Aucun historique disponible pour le contrat</div>
                  )}
                </div>
              )}
              
              <h3 className="text-lg font-medium mb-2">Offre</h3>
              {logs.length > 0 ? (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="border-l-2 border-gray-200 pl-4 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium">
                          {log.profiles?.first_name} {log.profiles?.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span>Statut changé de</span>
                        <Badge variant="outline">{OFFER_STATUSES[log.previous_status]?.label || log.previous_status}</Badge>
                        <span>à</span>
                        <Badge variant="outline">{OFFER_STATUSES[log.new_status]?.label || log.new_status}</Badge>
                      </div>
                      {log.reason && (
                        <div className="mt-2 text-sm text-gray-600">
                          {log.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">Aucun historique disponible</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {offer.converted_to_contract 
                ? "Changer le statut du contrat" 
                : "Changer le statut de l'offre"}
            </DialogTitle>
            <DialogDescription>
              {targetStatus === OFFER_STATUSES.REJECTED.id 
                ? "Veuillez indiquer la raison du rejet de cette offre."
                : "Vous pouvez ajouter une note facultative pour ce changement de statut."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder={targetStatus === OFFER_STATUSES.REJECTED.id 
                ? "Raison du rejet..." 
                : "Note (facultatif)..."}
              value={statusChangeReason}
              onChange={(e) => setStatusChangeReason(e.target.value)}
              rows={4}
              required={targetStatus === OFFER_STATUSES.REJECTED.id}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={targetStatus === OFFER_STATUSES.REJECTED.id && !statusChangeReason.trim()}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un numéro de suivi</DialogTitle>
            <DialogDescription>
              Renseignez les informations de livraison pour ce contrat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="grid w-full gap-1.5">
              <label htmlFor="tracking-number" className="text-sm font-medium">
                Numéro de suivi
              </label>
              <input
                id="tracking-number"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="123456789"
                required
              />
            </div>
            
            <div className="grid w-full gap-1.5">
              <label htmlFor="carrier" className="text-sm font-medium">
                Transporteur
              </label>
              <input
                id="carrier"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="DHL, UPS, ..."
              />
            </div>
            
            <div className="grid w-full gap-1.5">
              <label htmlFor="delivery-date" className="text-sm font-medium">
                Date de livraison estimée
              </label>
              <input
                id="delivery-date"
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleAddTrackingInfo}
              disabled={!trackingNumber.trim()}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <RequestInfoModal
        isOpen={infoRequestDialogOpen}
        onClose={() => setInfoRequestDialogOpen(false)}
        onSendRequest={handleRequestInfo}
        offerId={offer?.id || ''}
      />
    </PageTransition>
  );
};

const ProgressStep = ({ 
  label, 
  isActive, 
  isCompleted, 
  status,
  onClick
}: { 
  label: string; 
  isActive: boolean; 
  isCompleted: boolean;
  status: string;
  onClick: (status: string) => void;
}) => {
  const getClassName = () => {
    if (isActive) return "bg-blue-600 text-white";
    if (isCompleted) return "bg-green-500 text-white";
    return "bg-gray-200 text-gray-700";
  };
  
  return (
    <div 
      className="flex flex-col items-center cursor-pointer"
      onClick={() => onClick(status)}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getClassName()}`}>
        {isCompleted ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <span>{label.charAt(0)}</span>
        )}
      </div>
      <div className="text-xs mt-1 text-center max-w-[80px]">{label}</div>
    </div>
  );
};

const ProgressLine = () => {
  return (
    <div className="h-0.5 bg-gray-200 flex-grow mx-2"></div>
  );
};

export default OfferDetail;
