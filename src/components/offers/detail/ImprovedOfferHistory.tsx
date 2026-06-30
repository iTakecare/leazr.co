
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  User,
  ArrowRightLeft,
  RefreshCw,
  Mail,
  FileText,
  PenTool,
  Repeat,
  Paperclip,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WorkflowLog {
  id: string;
  offer_id: string;
  user_id: string;
  previous_status: string;
  new_status: string;
  reason: string | null;
  created_at: string;
  event_type?: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    role?: string;
  };
}

// Icône + couleur par type d'événement (lignes avec event_type non nul).
const EVENT_CONFIG: Record<string, { Icon: typeof Mail; cls: string }> = {
  email_offer: { Icon: Mail, cls: "bg-blue-100 text-blue-600" },
  email_doc_request: { Icon: Mail, cls: "bg-amber-100 text-amber-600" },
  email_reminder: { Icon: Mail, cls: "bg-amber-100 text-amber-600" },
  email_other: { Icon: Mail, cls: "bg-blue-100 text-blue-600" },
  pdf_generated: { Icon: FileText, cls: "bg-slate-100 text-slate-600" },
  contract_sent: { Icon: PenTool, cls: "bg-purple-100 text-purple-600" },
  esign: { Icon: PenTool, cls: "bg-purple-100 text-purple-600" },
  swap: { Icon: Repeat, cls: "bg-amber-100 text-amber-700" },
  document: { Icon: Paperclip, cls: "bg-slate-100 text-slate-600" },
};

interface ImprovedOfferHistoryProps {
  offerId: string;
}

const ImprovedOfferHistory: React.FC<ImprovedOfferHistoryProps> = ({ offerId }) => {
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);

  const getStatusLabel = (statusId: string) => {
    const statusMap: Record<string, string> = {
      'draft': 'Brouillon',
      'sent': 'Envoyée',
      'viewed': 'Vue',
      'signed': 'Signée',
      'approved': 'Approuvée',
      'completed': 'Finalisée',
      'rejected': 'Rejetée'
    };
    return statusMap[statusId] || statusId;
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('offer_workflow_logs')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            role
          )
        `)
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur lors de la récupération de l'historique:", error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [offerId]);

  const getDisplayName = (log: WorkflowLog) => {
    if (log.profiles?.first_name && log.profiles?.last_name) {
      return `${log.profiles.first_name} ${log.profiles.last_name}`;
    }
    return `Utilisateur`;
  };

  const getUserRole = (log: WorkflowLog) => {
    if (log.profiles?.role) {
      return log.profiles.role === 'admin' ? 'Admin' : 'Ambassador';
    }
    return "Utilisateur";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historique du workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historique du workflow
            {logs.length > 0 && (
              <Badge variant="secondary" className="ml-2">{logs.length}</Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Aucun historique disponible pour cette offre.
          </p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {logs.map((log) => {
              const evt = log.event_type ? EVENT_CONFIG[log.event_type] : null;
              const Icon = evt?.Icon ?? User;
              return (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${evt?.cls ?? "bg-blue-100 text-blue-600"}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{getDisplayName(log)}</span>
                      <Badge variant="outline" className="text-xs">{getUserRole(log)}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                    </span>
                  </div>

                  {log.event_type ? (
                    // Événement (e-mail, PDF, signature, swap…) : libellé direct.
                    <p className="text-sm font-medium">{log.reason}</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{getStatusLabel(log.previous_status)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{getStatusLabel(log.new_status)}</span>
                      </div>
                      {log.reason && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{log.reason}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            );})}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImprovedOfferHistory;
