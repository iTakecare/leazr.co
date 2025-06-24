
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timeline, TimelineItem, TimelineItemContent, TimelineItemIndicator, TimelineItemTitle } from "@/components/ui/timeline";
import { History, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface WorkflowTimelineProps {
  workflowLogs: any[];
  loading: boolean;
}

const AmbassadorWorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  workflowLogs,
  loading
}) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Date inconnue";
    try {
      return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-indigo-600" />
          Historique des modifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
          </div>
        ) : workflowLogs.length > 0 ? (
          <Timeline>
            {workflowLogs.map((log) => (
              <TimelineItem key={log.id}>
                <TimelineItemIndicator />
                <TimelineItemContent>
                  <TimelineItemTitle>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {log.profiles?.first_name 
                          ? `${log.profiles.first_name} ${log.profiles.last_name}` 
                          : "Système"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </TimelineItemTitle>
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span>Statut changé de</span>
                      <Badge variant="outline" className="text-xs">
                        {log.previous_status}
                      </Badge>
                      <span>à</span>
                      <Badge variant="outline" className="text-xs">
                        {log.new_status}
                      </Badge>
                    </div>
                    {log.reason && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>Raison:</strong> {log.reason}
                      </p>
                    )}
                  </div>
                </TimelineItemContent>
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <div className="text-center py-8">
            <History className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-muted-foreground">Aucun historique disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorWorkflowTimeline;
