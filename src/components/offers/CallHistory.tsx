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
  Headset,
  PhoneIncoming,
  PhoneOutgoing,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, parseISO, isToday, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { getCallLogs, deleteCallLog, CallLog } from "@/services/callLogService";
import { toast } from "sonner";
import { CallLogButton } from "./CallLogButton";
import ClientCallModal from "./ClientCallModal";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CallHistoryProps {
  offerId: string;
}

interface OfferClientInfo {
  clientId: string | null;
  clientName?: string;
  clientPhone: string | null;
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

interface VoiceCall {
  id: string;
  direction: string | null;
  status: string | null;
  to_phone: string | null;
  duration_seconds: number | null;
  recording_path: string | null;
  transcription: string | null;
  summary: string | null;
  created_at: string;
}

const VOICE_STATUS_FR: Record<string, string> = {
  ringing: "Sonné", in_progress: "En cours", completed: "Terminé",
  no_answer: "Sans réponse", busy: "Occupé", failed: "Échec", canceled: "Annulé",
};

export const CallHistory: React.FC<CallHistoryProps> = ({ offerId }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [voiceCalls, setVoiceCalls] = useState<VoiceCall[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [clientInfo, setClientInfo] = useState<OfferClientInfo>({
    clientId: null,
    clientPhone: null,
  });

  // Appels téléphoniques (softphone / agent IA) liés à la demande OU au client.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const filters = [`offer_id.eq.${offerId}`];
      if (clientInfo.clientId) filters.push(`client_id.eq.${clientInfo.clientId}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("voice_calls")
        .select("id, direction, status, to_phone, duration_seconds, recording_path, transcription, summary, created_at")
        .or(filters.join(","))
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled) setVoiceCalls((data as VoiceCall[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [offerId, clientInfo.clientId, callModalOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("offers")
        .select("client_id, client_name, clients(phone)")
        .eq("id", offerId)
        .single();
      if (cancelled || error || !data) return;
      setClientInfo({
        clientId: (data.client_id as string) ?? null,
        clientName: (data.client_name as string) ?? undefined,
        clientPhone: (data.clients?.phone as string) ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [offerId]);

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-violet-600 hover:text-violet-700 hover:bg-violet-50 border-violet-200"
              onClick={() => setCallModalOpen(true)}
            >
              <Headset className="w-4 h-4 mr-2" />
              Gérer l'appel
            </Button>
            <CallLogButton
              offerId={offerId}
              onCallLogged={fetchLogs}
              className="h-8 text-sm text-sky-600 hover:text-sky-700 hover:bg-sky-50 border-sky-200"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Appels téléphoniques (softphone / agent IA) avec enregistrement + transcription */}
        {voiceCalls.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Headset className="w-3.5 h-3.5" /> Appels téléphoniques
            </p>
            {voiceCalls.map((vc) => {
              const isOpen = !!expanded[vc.id];
              const hasContent = !!(vc.transcription || vc.summary || vc.recording_path);
              return (
                <div key={vc.id} className="rounded-lg border bg-white">
                  <div className="flex items-center gap-3 p-3">
                    <span className={`p-1.5 rounded-full shrink-0 ${vc.direction === "inbound" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                      {vc.direction === "inbound" ? <PhoneIncoming className="w-3.5 h-3.5" /> : <PhoneOutgoing className="w-3.5 h-3.5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium font-mono">{vc.to_phone ?? "—"}</span>
                        <Badge variant="outline" className="text-xs">{VOICE_STATUS_FR[vc.status ?? ""] ?? vc.status}</Badge>
                        {vc.duration_seconds ? (
                          <span className="text-xs text-muted-foreground">{Math.floor(vc.duration_seconds / 60)}m{String(vc.duration_seconds % 60).padStart(2, "0")}s</span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(vc.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    {hasContent && (
                      <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={() => setExpanded((e) => ({ ...e, [vc.id]: !isOpen }))}>
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        {isOpen ? "Masquer" : "Détails"}
                        <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </Button>
                    )}
                  </div>
                  {isOpen && hasContent && (
                    <div className="border-t p-3 space-y-2">
                      {vc.recording_path && <VoiceRecording path={vc.recording_path} />}
                      {vc.summary && (
                        <div className="rounded-md bg-violet-50 border border-violet-100 p-2 text-sm">
                          <p className="text-xs font-medium text-violet-700 mb-0.5">Résumé IA</p>
                          {vc.summary}
                        </div>
                      )}
                      {vc.transcription && (
                        <div className="rounded-md border p-2 text-sm whitespace-pre-wrap max-h-48 overflow-auto">
                          {vc.transcription}
                        </div>
                      )}
                      {!vc.transcription && vc.recording_path && (
                        <p className="text-xs text-muted-foreground">Transcription en cours ou non lancée.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <Separator className="my-2" />
          </div>
        )}
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 && voiceCalls.length === 0 ? (
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

      <ClientCallModal
        open={callModalOpen}
        onOpenChange={setCallModalOpen}
        offerId={offerId}
        clientId={clientInfo.clientId}
        clientName={clientInfo.clientName}
        clientPhone={clientInfo.clientPhone}
        onLogged={fetchLogs}
      />
    </Card>
  );
};

// Lecteur de l'enregistrement (bucket privé → URL signée)
const VoiceRecording: React.FC<{ path: string }> = ({ path }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).storage.from("call-recordings").createSignedUrl(path, 3600)
      .then(({ data }: { data: { signedUrl?: string } | null }) => { if (!cancelled) setUrl(data?.signedUrl ?? null); });
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return <div className="h-10 bg-slate-100 animate-pulse rounded" />;
  return <audio controls preload="none" src={url} className="w-full h-10" />;
};

export default CallHistory;
