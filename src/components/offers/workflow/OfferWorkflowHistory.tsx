
import React from "react";
import { format } from "date-fns";
import { Clock, User, ArrowRight, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OFFER_STATUSES } from "../OfferStatusBadge";
import { Badge } from "@/components/ui/badge";

interface WorkflowLog {
  id: string;
  offer_id: string;
  user_id: string;
  previous_status: string;
  new_status: string;
  reason: string | null;
  created_at: string;
  user_name?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    role?: string;
    id: string;
  };
}

interface OfferWorkflowHistoryProps {
  logs: WorkflowLog[];
}

const OfferWorkflowHistory: React.FC<OfferWorkflowHistoryProps> = ({ logs }) => {
  console.log("OfferWorkflowHistory - Received logs:", logs);
  
  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique des changements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Aucun historique disponible pour cette offre.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusLabel = (statusId: string) => {
    const status = Object.values(OFFER_STATUSES).find(s => s.id === statusId);
    return status ? status.label : statusId;
  };

  // Obtenir les initiales à partir du nom
  const getInitials = (log: WorkflowLog) => {
    if (log.user_name) {
      const parts = log.user_name.split(' ');
      if (parts.length >= 2) {
        return parts[0].charAt(0) + parts[1].charAt(0);
      }
      return log.user_name.substring(0, 2).toUpperCase();
    }
    
    if (log.profiles?.first_name && log.profiles?.last_name) {
      return log.profiles.first_name.charAt(0) + log.profiles.last_name.charAt(0);
    }
    
    return log.user_id.substring(0, 2).toUpperCase();
  };

  // Obtenir le nom à afficher
  const getDisplayName = (log: WorkflowLog) => {
    if (log.user_name) {
      return log.user_name;
    }
    
    if (log.profiles?.first_name && log.profiles?.last_name) {
      return `${log.profiles.first_name} ${log.profiles.last_name}`;
    }
    
    return `Utilisateur (${log.user_id.substring(0, 6)})`;
  };

  // Obtenir le rôle de l'utilisateur
  const getUserRole = (log: WorkflowLog) => {
    if (log.profiles?.role) {
      return log.profiles.role === 'admin' ? 'Admin' : log.profiles.role;
    }
    
    return "Administrateur";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des changements</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto">
        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={log.id} className="space-y-2">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(log)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {getDisplayName(log)}
                      </p>
                      <Badge variant="outline" className="text-xs">{getUserRole(log)}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(log.created_at), "dd/MM/yyyy à HH:mm")}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm mt-2">
                    <span className="text-muted-foreground">{getStatusLabel(log.previous_status)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{getStatusLabel(log.new_status)}</span>
                  </div>
                  {log.reason && (
                    <p className="text-sm mt-1 text-muted-foreground">
                      Raison: {log.reason}
                    </p>
                  )}
                </div>
              </div>
              {index < logs.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default OfferWorkflowHistory;
