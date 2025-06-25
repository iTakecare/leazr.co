
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OfferWorkflowHistory from "./workflow/OfferWorkflowHistory";
import OfferHistoryTimeline from "./OfferHistoryTimeline";
import { getOfferHistory, OfferHistoryEvent } from "@/services/offers/offerHistory";
import { getWorkflowHistory } from "@/services/offers/offerStatus";

interface OfferCompleteHistoryProps {
  offerId: string;
}

const OfferCompleteHistory: React.FC<OfferCompleteHistoryProps> = ({ offerId }) => {
  const [completeHistory, setCompleteHistory] = useState<OfferHistoryEvent[]>([]);
  const [workflowHistory, setWorkflowHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!offerId) return;
      
      try {
        setLoading(true);
        
        // Récupérer les deux types d'historique en parallèle
        const [completeEvents, workflowLogs] = await Promise.all([
          getOfferHistory(offerId),
          getWorkflowHistory(offerId)
        ]);
        
        setCompleteHistory(completeEvents);
        setWorkflowHistory(workflowLogs);
      } catch (error) {
        console.error("Erreur lors du chargement de l'historique:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [offerId]);

  return (
    <Tabs defaultValue="complete" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="complete">
          Historique complet
          {completeHistory.length > 0 && (
            <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
              {completeHistory.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="workflow">
          Changements de statut
          {workflowHistory.length > 0 && (
            <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
              {workflowHistory.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="complete" className="mt-4">
        <OfferHistoryTimeline events={completeHistory} loading={loading} />
      </TabsContent>
      
      <TabsContent value="workflow" className="mt-4">
        <OfferWorkflowHistory logs={workflowHistory} />
      </TabsContent>
    </Tabs>
  );
};

export default OfferCompleteHistory;
