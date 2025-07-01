import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, User, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import ContractStatusBadge from "./ContractStatusBadge";

interface ContractHistoryPanelProps {
  logs: any[];
}

const ContractHistoryPanel: React.FC<ContractHistoryPanelProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun historique disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique ({logs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div key={`${log.id}-${index}`} className="relative">
                {/* Timeline line */}
                {index < logs.length - 1 && (
                  <div className="absolute left-4 top-12 w-0.5 h-12 bg-border" />
                )}
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {log.profiles?.first_name || log.user_name || 'Utilisateur système'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formatDate(log.created_at)}
                      </Badge>
                    </div>
                    
                    {log.previous_status !== log.new_status ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">Statut changé de</span>
                        <ContractStatusBadge status={log.previous_status} />
                        <span className="text-sm">à</span>
                        <ContractStatusBadge status={log.new_status} />
                      </div>
                    ) : (
                      <div className="text-sm text-primary font-medium">
                        ℹ️ Action sur le contrat
                      </div>
                    )}
                    
                    {log.reason && (
                      <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
                        {log.reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ContractHistoryPanel;