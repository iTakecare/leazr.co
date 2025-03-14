
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Building, FileText, Send, Download, RefreshCw, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getOfferById, updateOfferStatus, getWorkflowLogs, deleteOffer } from "@/services/offerService";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import OfferStatusBadge, { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import PageTransition from "@/components/layout/PageTransition";

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
      
      // Parse equipment data if available
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
      
      // Fetch workflow logs
      const workflowLogs = await getWorkflowLogs(id);
      setLogs(workflowLogs);
      
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
  
  const handleStatusChange = async () => {
    if (!offer || !targetStatus) return;
    
    try {
      setIsUpdatingStatus(true);
      
      const success = await updateOfferStatus(
        offer.id, 
        targetStatus, 
        offer.workflow_status,
        statusChangeReason
      );
      
      if (success) {
        toast.success(`Statut mis à jour avec succès`);
        
        // Refresh the offer details to get updated status
        fetchOfferDetails();
        
        setStatusDialogOpen(false);
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Erreur lors de la mise à jour du statut");
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
  
  // Détermine les actions disponibles en fonction du statut de l'offre
  const getAvailableActions = () => {
    if (!offer) return [];
    
    const actions = [];
    
    // Actions spécifiques aux statuts
    switch (offer.workflow_status) {
      case OFFER_STATUSES.DRAFT.id:
        actions.push({
          label: "Envoyer au client",
          icon: Send,
          onClick: () => openStatusChangeDialog(OFFER_STATUSES.SENT.id),
        });
        break;
        
      case OFFER_STATUSES.SENT.id:
        actions.push({
          label: "Marquer comme approuvée",
          icon: Building,
          onClick: () => openStatusChangeDialog(OFFER_STATUSES.APPROVED.id),
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
          label: "Rejeter l'offre",
          icon: Trash2,
          onClick: () => openStatusChangeDialog(OFFER_STATUSES.REJECTED.id),
        });
        break;
    }
    
    // Action de suppression (sauf si convertie en contrat)
    if (!offer.converted_to_contract) {
      actions.push({
        label: "Supprimer l'offre",
        icon: Trash2,
        onClick: handleDeleteOffer,
        className: "bg-red-600 text-white hover:bg-red-700",
      });
    }
    
    return actions;
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
            <OfferStatusBadge status={offer.workflow_status} isConverted={offer.converted_to_contract} />
            {offer.converted_to_contract && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Contrat actif
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            {availableActions.map((action, index) => (
              <Button 
                key={action.label}
                onClick={action.onClick}
                className={action.className}
                disabled={isUpdatingStatus}
                variant="default"
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </Button>
            ))}
            
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
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
                      <div className="flex items-center gap-2 text-sm">
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
      
      {/* Dialog pour le changement de statut avec raison */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut de l'offre</DialogTitle>
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
    </PageTransition>
  );
};

export default OfferDetail;
