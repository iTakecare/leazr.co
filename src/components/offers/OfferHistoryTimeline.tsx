
import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkflowLog {
  id: string;
  offer_id: string;
  user_id: string;
  previous_status: string;
  new_status: string;
  reason?: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface OfferHistoryTimelineProps {
  logs: WorkflowLog[];
  loading?: boolean;
}

const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: "Brouillon",
    sent: "Envoyée",
    info_requested: "Info demandée",
    requested_info: "Info demandée",
    valid_itc: "Validée ITC",
    itc_validated: "Validée ITC", 
    approved: "Approuvée",
    leaser_review: "Valid. bailleur",
    financed: "Financée",
    rejected: "Rejetée",
    client_waiting: "Client en attente",
    signed: "Signée",
    archived: "Archivée"
  };
  
  return statusMap[status] || status;
};

const getInitials = (name?: string): string => {
  if (!name) return "?";
  
  return name
    .split(" ")
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();
};

const getFullName = (profile?: { first_name?: string; last_name?: string; email?: string }): string => {
  if (!profile) return "Utilisateur inconnu";
  
  const firstName = profile.first_name || "";
  const lastName = profile.last_name || "";
  
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  
  return profile.email?.split('@')[0] || "Utilisateur inconnu";
};

const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: fr });
  } catch (error) {
    return "Date incorrecte";
  }
};

const OfferHistoryTimeline: React.FC<OfferHistoryTimelineProps> = ({ logs, loading = false }) => {
  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun historique disponible
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6">
        {logs.map((log) => (
          <div key={log.id} className="relative pl-6 pb-6 border-l border-gray-200">
            <div className="absolute -left-1.5 mt-1.5">
              <Avatar className="h-3 w-3 border-2 border-white bg-primary">
                <AvatarFallback className="text-[8px] text-white">
                  {log.profiles ? getInitials(getFullName(log.profiles)) : "?"}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="mb-1">
              <p className="text-sm font-medium">{getFullName(log.profiles)}</p>
              <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
            </div>
            
            <div className="bg-gray-50 rounded-md p-2.5 text-sm">
              <p>
                Changement de statut: <span className="font-semibold">{getStatusLabel(log.previous_status)}</span> → <span className="font-semibold">{getStatusLabel(log.new_status)}</span>
              </p>
              {log.reason && (
                <p className="text-muted-foreground text-xs mt-1">
                  Raison: {log.reason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default OfferHistoryTimeline;
