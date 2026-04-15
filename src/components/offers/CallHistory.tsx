import React, { useEffect, useState } from "react";
import {
  Phone,
  Voicemail,
  PhoneMissed,
  PhoneCall,
  Trash2,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { getCallLogs, deleteCallLog, CallLog } from "@/services/callLogService";
import { toast } from "sonner";
import { CallLogButton } from "./CallLogButton";
import { useAuth } from "@/context/AuthContext";

interface CallHistoryProps {
  offerId: string;
}

const STATUS_CONFIG = {
  voicemail: {
    label: "Messagerie vocale",
    icon: Voicemail,
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    borderClass: "border-l-amber-400",
    iconClass: "bg-amber-100 text-amber-600",
  },
  no_answer: {
    label: "Pas de réponse",
    icon: PhoneMissed,
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    borderClass: "border-l-red-400",
    iconClass: "bg-red-100 text-red-600",
  },
  reached: {
    label: "Client joint",
    icon: PhoneCall,
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    borderClass: "border-l-green-400",
    iconClass: "bg-green-100 text-green-600",
  },
};

const authorName = (log: CallLog): string => {
  const p = log.profiles;
  if (!p) return "Inconnu";
  const first = p.first_name ?? "";
  const last = p.last_name ?? "";
  const full = `${first} ${last}`.trim();
  return full || "Inconnu";
};

export const CallHistory: React.FC<CallHistoryProps> = ({ offerId }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const data = await getCallLogs(offerId);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [offerId]);

  const handleDelete = async (id: string) => {
    const success = await deleteCallLog(id);
    if (success) {
      toast.success("Appel supprimé");
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } else {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-sky-600" />
            Suivi des appels
            {logs.length > 0 && (
              <span className="text-xs font-normal bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                {logs.length}
              </span>
            )}
          </CardTitle>
          <CallLogButton offerId={offerId} onCallLogged={fetchLogs} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              Aucun appel enregistré
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Utilisez le bouton "Appel client" pour tracer vos contacts
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const config = STATUS_CONFIG[log.status];
              const Icon = config.icon;
              const calledAtDate = parseISO(log.called_at);

              // Callback reminder display
              const hasCallback = log.callback_date && log.status !== "reached";
              const cbDate = log.callback_date ? parseISO(log.callback_date) : null;
              const cbOverdue = cbDate && isPast(cbDate) && !isToday(cbDate);
              const cbToday = cbDate && isToday(cbDate);

              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-l-2 bg-slate-50 hover:bg-slate-100 transition-colors ${config.borderClass}`}
                >
                  {/* Status icon */}
                  <div className={`p-1.5 rounded-full shrink-0 mt-0.5 ${config.iconClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Row 1: status badge + date badge + author */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status */}
                      <Badge variant="outline" className={`text-xs ${config.badgeClass}`}>
                        {config.label}
                      </Badge>

                      {/* Date du contact (called_at) — toujours affiché */}
                      <Badge
                        variant="outline"
                        className="text-xs bg-slate-100 text-slate-700 border-slate-200 flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        {format(calledAtDate, "dd/MM/yyyy", { locale: fr })}
                        {" à "}
                        {format(calledAtDate, "HH:mm")}
                      </Badge>

                      {/* Auteur */}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {authorName(log)}
                      </span>
                    </div>

                    {/* Row 2: rappel prévu (si applicable) */}
                    {hasCallback && cbDate && (
                      <div className="mt-1 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span
                          className={`text-xs font-medium flex items-center gap-1 ${
                            cbOverdue
                              ? "text-red-600"
                              : cbToday
                              ? "text-orange-600"
                              : "text-sky-600"
                          }`}
                        >
                          Rappel prévu :{" "}
                          {cbOverdue
                            ? `${format(cbDate, "dd/MM/yyyy")} (en retard)`
                            : cbToday
                            ? `aujourd'hui (${format(cbDate, "dd/MM/yyyy")})`
                            : format(cbDate, "dd/MM/yyyy")}
                        </span>
                      </div>
                    )}

                    {/* Row 3: notes */}
                    {log.notes && (
                      <p className="text-xs text-gray-600 mt-1.5 italic bg-white rounded px-2 py-1 border border-gray-100">
                        "{log.notes}"
                      </p>
                    )}
                  </div>

                  {/* Delete button — only for own logs */}
                  {log.created_by === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                      onClick={() => handleDelete(log.id)}
                      title="Supprimer cet appel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CallHistory;
