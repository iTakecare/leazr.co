
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getWorkflowHistory, getCompletedStatuses, updateOfferStatus } from "@/services/offers/offerStatus";
import OfferWorkflowVisualizer from "./workflow/OfferWorkflowVisualizer";
import OfferWorkflowHistory from "./workflow/OfferWorkflowHistory";
import StatusChangeDialog from "./workflow/StatusChangeDialog";
import RequestInfoModal from "./RequestInfoModal";
import { OFFER_STATUSES } from "./OfferStatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { sendDocumentsRequestEmail } from "@/services/emailService";
import { getOfferById } from "@/services/offers/offerDetail";
import { sendInfoRequest } from "@/services/offers/offerWorkflow";

interface OfferWorkflowSectionProps {
  offerId: string;
  currentStatus: string;
  lastUpdated?: string;
  isAdmin?: boolean;
  onStatusChange?: (newStatus: string) => void;
}

const OfferWorkflowSection: React.FC<OfferWorkflowSectionProps> = ({
  offerId,
  currentStatus,
  lastUpdated,
  isAdmin = false,
  onStatusChange,
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [completedStatuses, setCompletedStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [requestInfoModalOpen, setRequestInfoModalOpen] = useState(false);
  const [offerData, setOfferData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [historyData, statusesData, offerDetails] = await Promise.all([
        getWorkflowHistory(offerId),
        getCompletedStatuses(offerId),
        getOfferById(offerId)
      ]);
      
      setLogs(historyData);
      setCompletedStatuses(statusesData);
      setOfferData(offerDetails);
    } catch (error) {
      console.error("Error fetching workflow data:", error);
      toast.error("Erreur lors du chargement des données de workflow");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [offerId]);

  const handleStatusClick = (newStatus: string) => {
    if (!isAdmin) return;
    if (newStatus === currentStatus) return;
    
    setSelectedStatus(newStatus);
    setDialogOpen(true);
  };

  const handleStatusChange = async (reason: string) => {
    if (!selectedStatus) return;
    
    setIsUpdating(true);
    try {
      const success = await updateOfferStatus(offerId, selectedStatus, currentStatus, reason);
      
      if (success) {
        toast.success(`Statut mis à jour avec succès: ${getStatusLabel(selectedStatus)}`);
        fetchData();
        
        // Appeler la fonction de callback si fournie
        if (onStatusChange) {
          onStatusChange(selectedStatus);
        }
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdating(false);
      setDialogOpen(false);
      setSelectedStatus(null);
    }
  };

  const handleRequestInfo = async (requestedDocs: string[], customMessage: string) => {
    if (!offerData) {
      toast.error("Données de l'offre non disponibles");
      return;
    }
    
    try {
      // Envoyer l'email via le service email
      const emailSent = await sendDocumentsRequestEmail(
        offerId,
        offerData.client_email,
        offerData.client_name,
        requestedDocs,
        customMessage
      );
      
      if (emailSent) {
        // Mettre à jour le statut de l'offre
        const infoRequestSent = await sendInfoRequest({
          offerId,
          requestedDocs,
          customMessage,
          previousStatus: currentStatus
        });
        
        if (infoRequestSent) {
          toast.success("Demande d'informations envoyée au client avec succès");
          fetchData();
          
          // Mettre à jour le statut sur l'interface
          if (onStatusChange) {
            onStatusChange("info_requested");
          }
        } else {
          toast.error("Erreur lors de la mise à jour du statut de l'offre");
        }
      } else {
        toast.error("Erreur lors de l'envoi de l'email au client");
      }
    } catch (error) {
      console.error("Error requesting information:", error);
      toast.error("Erreur lors de la demande d'informations");
    } finally {
      setRequestInfoModalOpen(false);
    }
  };

  const getStatusLabel = (statusId: string) => {
    const status = Object.values(OFFER_STATUSES).find(s => s.id === statusId);
    return status ? status.label : statusId;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processus de validation</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Chargement des données...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Suivi de l'offre</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="workflow">Processus</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>
            
            <TabsContent value="workflow" className="py-4">
              <OfferWorkflowVisualizer
                currentStatus={currentStatus}
                completedStatuses={completedStatuses}
                onStatusChange={isAdmin ? handleStatusClick : undefined}
                lastUpdated={lastUpdated}
                onRequestDocuments={isAdmin ? () => setRequestInfoModalOpen(true) : undefined}
              />
              
              {isAdmin && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {isAdmin ? "Cliquez sur une étape pour changer le statut de l'offre" : ""}
                  </p>
                  <Button
                    variant="outline"
                    onClick={fetchData}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      "Actualiser"
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="history">
              <OfferWorkflowHistory logs={logs} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <StatusChangeDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleStatusChange}
        currentStatus={currentStatus}
        newStatus={selectedStatus || ''}
        isUpdating={isUpdating}
        getStatusLabel={getStatusLabel}
      />
      
      <RequestInfoModal
        isOpen={requestInfoModalOpen}
        onClose={() => setRequestInfoModalOpen(false)}
        onSendRequest={handleRequestInfo}
        offerId={offerId}
      />
    </>
  );
};

export default OfferWorkflowSection;
