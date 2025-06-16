
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getWorkflowHistory, getCompletedStatuses, updateOfferStatus } from "@/services/offers/offerStatus";
import OfferWorkflowVisualizer from "./workflow/OfferWorkflowVisualizer";
import OfferWorkflowHistory from "./workflow/OfferWorkflowHistory";
import StatusChangeDialog from "./workflow/StatusChangeDialog";
import { OFFER_STATUSES } from "./OfferStatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw } from "lucide-react";

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
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefreshIndicator = false) => {
    console.log("🔄 OfferWorkflowSection - Fetching data for offer:", offerId);
    
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const [historyData, statusesData] = await Promise.all([
        getWorkflowHistory(offerId),
        getCompletedStatuses(offerId)
      ]);
      
      console.log("📊 OfferWorkflowSection - History data received:", historyData);
      console.log("📋 OfferWorkflowSection - Completed statuses received:", statusesData);
      
      setLogs(historyData);
      setCompletedStatuses(statusesData);
    } catch (error) {
      console.error("❌ Error fetching workflow data:", error);
      toast.error("Erreur lors du chargement des données de workflow");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (offerId) {
      console.log("🚀 OfferWorkflowSection - useEffect triggered with offerId:", offerId);
      fetchData();
    }
  }, [offerId]);

  const handleStatusClick = (newStatus: string) => {
    if (!isAdmin) return;
    if (newStatus === currentStatus) return;
    
    console.log("👆 OfferWorkflowSection - Status click:", newStatus);
    setSelectedStatus(newStatus);
    setDialogOpen(true);
  };

  const handleStatusChange = async (reason: string) => {
    if (!selectedStatus) return;
    
    console.log("✅ OfferWorkflowSection - Confirming status change:", selectedStatus, "with reason:", reason);
    setIsUpdating(true);
    
    try {
      const success = await updateOfferStatus(offerId, selectedStatus, currentStatus, reason);
      
      if (success) {
        toast.success(`Statut mis à jour avec succès: ${getStatusLabel(selectedStatus)}`);
        
        // Force refresh of data after status change
        console.log("🔄 OfferWorkflowSection - Refreshing data after status change");
        await fetchData(true);
        
        // Appeler la fonction de callback si fournie
        if (onStatusChange) {
          onStatusChange(selectedStatus);
        }
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("❌ Error updating status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdating(false);
      setDialogOpen(false);
      setSelectedStatus(null);
    }
  };

  const getStatusLabel = (statusId: string) => {
    const status = Object.values(OFFER_STATUSES).find(s => s.id === statusId);
    return status ? status.label : statusId;
  };

  const handleManualRefresh = () => {
    console.log("🔄 Manual refresh requested");
    fetchData(true);
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
          <div className="flex justify-between items-center">
            <CardTitle>Suivi de l'offre</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="workflow">Processus</TabsTrigger>
              <TabsTrigger value="history">
                Historique
                {logs.length > 0 && (
                  <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                    {logs.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="workflow" className="py-4">
              <OfferWorkflowVisualizer
                currentStatus={currentStatus}
                completedStatuses={completedStatuses}
                onStatusChange={isAdmin ? handleStatusClick : undefined}
                lastUpdated={lastUpdated}
              />
              
              {isAdmin && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {isAdmin ? "Cliquez sur une étape pour changer le statut de l'offre" : ""}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fetchData(true)}
                    disabled={isUpdating || refreshing}
                  >
                    {isUpdating || refreshing ? (
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
              {logs.length === 0 && (
                <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-sm text-muted-foreground mb-3">
                    Aucun changement de statut effectué pour le moment.
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Les changements de statut apparaîtront ici automatiquement.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Actualisation...' : 'Actualiser l\'historique'}
                  </Button>
                </div>
              )}
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
    </>
  );
};

export default OfferWorkflowSection;
