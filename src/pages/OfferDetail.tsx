import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getOfferById } from "@/services/offers/offerDetail";
import { getWorkflowLogs } from "@/services/offers/offerWorkflow";
import { deleteOffer, updateOfferStatus } from "@/services/offers/offerStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Mail, 
  FileText, 
  Trash2, 
  AlertCircle, 
  Send,
  FileCheck,
  UserCheck,
  Building,
  Calendar,
  Clock,
  Check,
  X
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { formatEquipmentDisplay } from "@/utils/equipmentFormatter";
import { generateSignatureLink } from "@/services/offerService";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import OfferStatusBadge from "@/components/offers/OfferStatusBadge";
import WorkflowSelector from "@/components/offers/WorkflowSelector";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import OfferHistoryTimeline from "@/components/offers/OfferHistoryTimeline";

export const OFFER_STATUSES = {
  DRAFT: {
    id: 'draft',
    label: 'Brouillon',
    progressValue: 0
  },
  SENT: {
    id: 'sent',
    label: 'Envoyée',
    progressValue: 20
  },
  REQUESTED_INFO: {
    id: 'requested_info',
    label: 'Info Client',
    progressValue: 30
  },
  CLIENT_WAITING: {
    id: 'client_waiting',
    label: 'En attente',
    progressValue: 40
  },
  VALID_ITC: {
    id: 'valid_itc',
    label: 'Valid. ITC',
    progressValue: 50
  },
  ITC_VALIDATED: {
    id: 'itc_validated',
    label: 'Validée ITC',
    progressValue: 50
  },
  APPROVED: {
    id: 'approved',
    label: 'Approuvée',
    progressValue: 60
  },
  LEASER_REVIEW: {
    id: 'leaser_review',
    label: 'Valid. bailleur',
    progressValue: 70
  },
  FINANCED: {
    id: 'financed',
    label: 'Financée',
    progressValue: 100
  },
  SIGNED: {
    id: 'signed',
    label: 'Signée',
    progressValue: 90
  },
  ARCHIVED: {
    id: 'archived',
    label: 'Archivée',
    progressValue: 100
  },
  REJECTED: {
    id: 'rejected',
    label: 'Rejetée',
    progressValue: 0
  }
};

const OfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deletingOffer, setDeletingOffer] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  useEffect(() => {
    if (!id) {
      setError("ID d'offre manquant");
      return;
    }

    const fetchOffer = async () => {
      try {
        setLoading(true);
        const offerData = await getOfferById(id);
        if (!offerData) {
          setError("Offre introuvable");
          return;
        }
        setOffer(offerData);
      } catch (error: any) {
        console.error("Erreur lors du chargement de l'offre:", error);
        setError(`Erreur: ${error.message || "Impossible de charger l'offre"}`);
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [id]);

  useEffect(() => {
    const fetchOfferAndLogs = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const offerData = await getOfferById(id);
        
        if (!offerData) {
          setError("Offre introuvable");
          return;
        }
        
        setOffer(offerData);
        
        // Fetch workflow logs
        setIsLoadingLogs(true);
        const logs = await getWorkflowLogs(id);
        setWorkflowLogs(logs);
      } catch (error: any) {
        console.error("Erreur lors du chargement de l'offre:", error);
        setError(`Erreur: ${error.message || "Impossible de charger l'offre"}`);
      } finally {
        setLoading(false);
        setIsLoadingLogs(false);
      }
    };
    
    fetchOfferAndLogs();
  }, [id]);

  const handleDelete = async () => {
    setDeletingOffer(true);
    try {
      const success = await deleteOffer(id!);
      if (success) {
        toast.success("Offre supprimée avec succès");
        navigate("/offers");
      } else {
        toast.error("Erreur lors de la suppression de l'offre");
      }
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Erreur lors de la suppression de l'offre");
    } finally {
      setDeletingOffer(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!offer) return;

    setUpdatingStatus(true);
    try {
      const success = await updateOfferStatus(offer.id, newStatus, offer.workflow_status);
      if (success) {
        toast.success(`Statut mis à jour à: ${newStatus}`);
        
        // Update the offer state with the new status
        setOffer(prevOffer => ({ ...prevOffer, workflow_status: newStatus }));
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setUpdatingStatus(false);
    }
  };

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
            <Button onClick={() => navigate("/offers")}>
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
            <Button onClick={() => navigate("/offers")}>
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
        <div className="md:flex items-center justify-between mb-4">
          <div className="mb-2 md:mb-0">
            <Button variant="ghost" onClick={() => navigate("/offers")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux offres
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => window.open(generateSignatureLink(offer.id), "_blank")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Voir l'offre
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-bold">{offer.client_name}</CardTitle>
                    <p className="text-muted-foreground">
                      ID de l'offre: {offer.id}
                    </p>
                  </div>
                  <OfferStatusBadge status={offer.workflow_status} />
                </div>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="details">
                  <TabsList>
                    <TabsTrigger value="details">Détails</TabsTrigger>
                    <TabsTrigger value="equipment">Équipement</TabsTrigger>
                    <TabsTrigger value="history">Historique</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium">Informations client</h3>
                        <div className="text-gray-600">
                          <p>Nom: {offer.client_name}</p>
                          {offer.clients?.company && <p>Entreprise: {offer.clients.company}</p>}
                          {offer.clients?.email && <p>Email: {offer.clients.email}</p>}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium">Détails de l'offre</h3>
                        <div className="text-gray-600">
                          <p>Montant: {formatCurrency(offer.amount)}</p>
                          <p>Mensualité: {formatCurrency(offer.monthly_payment)}</p>
                          <p>Coefficient: {offer.coefficient}</p>
                          {offer.commission && <p>Commission: {formatCurrency(offer.commission)}</p>}
                        </div>
                      </div>
                      
                      {offer.remarks && (
                        <div>
                          <h3 className="text-lg font-medium">Remarques</h3>
                          <div className="text-gray-600 whitespace-pre-line">{offer.remarks}</div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="equipment">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Équipement</h3>
                      <p className="text-gray-600 whitespace-pre-line">
                        {formatEquipmentDisplay(offer.equipment_description)}
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="history" className="pt-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Historique des modifications</h3>
                      <OfferHistoryTimeline logs={workflowLogs} loading={isLoadingLogs} />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2">Statut actuel:</h4>
                    <OfferStatusBadge status={offer.workflow_status} />
                  </div>
                  <Separator />
                  <div>
                    <h4 className="mb-2">Changer le statut:</h4>
                    <WorkflowSelector
                      currentStatus={offer.workflow_status}
                      onStatusChange={handleStatusChange}
                      disabled={updatingStatus}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {showDeleteConfirm && (
          <ConfirmDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            title="Supprimer l'offre"
            description="Êtes-vous sûr de vouloir supprimer cette offre ? Cette action ne peut pas être annulée."
            confirmText="Supprimer"
            cancelText="Annuler"
            onConfirm={handleDelete}
            loading={deletingOffer}
            destructive
          />
        )}
      </Container>
    </PageTransition>
  );
};

export default OfferDetail;
