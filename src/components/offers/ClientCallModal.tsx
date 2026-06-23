import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Voicemail,
  Mic,
  MicOff,
  Calendar,
  Loader2,
  Sparkles,
  CheckSquare,
  Clock,
  Bot,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSoftphone } from "@/hooks/useSoftphone";

// Le client supabase est typé sur les tables connues ; ces tables vocales/IA
// ne sont pas dans les types générés → on relâche le typage localement.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type CallResult = "voicemail" | "no_answer" | "reached";

interface AiAction {
  kind: "task" | "link_offer" | "callback" | "callback_ai";
  payload: {
    title?: string;
    description?: string;
    due_in_days?: number;
    priority?: string;
    in_days?: number;
    reason?: string;
    [key: string]: unknown;
  };
  reason?: string;
}

interface VoiceCallRow {
  id: string;
  status?: string | null;
  recording_path?: string | null;
  transcription?: string | null;
  summary?: string | null;
  ai_actions?: AiAction[] | null;
}

export interface ClientCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  clientId?: string | null;
  clientName?: string;
  clientPhone?: string | null;
  onLogged?: () => void;
}

const STATUS_OPTIONS: {
  value: CallResult;
  label: string;
  icon: typeof Voicemail;
  color: string;
}[] = [
  { value: "voicemail", label: "Messagerie vocale", icon: Voicemail, color: "amber" },
  { value: "no_answer", label: "Pas de réponse", icon: PhoneOff, color: "red" },
  { value: "reached", label: "Client joint", icon: PhoneCall, color: "green" },
];

const CALLBACK_OPTIONS = [
  { label: "Demain", days: 1 },
  { label: "2 jours", days: 2 },
  { label: "3 jours", days: 3 },
  { label: "1 semaine", days: 7 },
  { label: "2 semaines", days: 14 },
];

const NOTE_TEMPLATES: Record<CallResult, string[]> = {
  voicemail: [
    "Message laissé — rappel demandé",
    "Messagerie pleine",
    "Message laissé, envoi email de suivi",
  ],
  no_answer: [
    "Sonnerie sans réponse",
    "Numéro occupé",
    "Injoignable, nouvel essai prévu",
  ],
  reached: [
    "Intéressé — envoi du devis prévu",
    "Réfléchit encore, rappel convenu",
    "Accord de principe — en attente des documents",
    "Refus définitif du client",
  ],
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const ClientCallModal: React.FC<ClientCallModalProps> = ({
  open,
  onOpenChange,
  offerId,
  clientId,
  clientName,
  clientPhone,
  onLogged,
}) => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);

  // --- Volet 1 : résultat d'appel
  const [status, setStatus] = useState<CallResult>("voicemail");
  const [callbackDays, setCallbackDays] = useState<number | null>(1);
  const [notes, setNotes] = useState("");
  const [savingLog, setSavingLog] = useState(false);

  // --- Volet 2 : softphone
  const softphone = useSoftphone(open);
  const [activeVoiceCallId, setActiveVoiceCallId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // --- Volet 3 : transcription
  const [voiceCall, setVoiceCall] = useState<VoiceCallRow | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  // companyId au montage / ouverture
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await db
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      if (!cancelled) setCompanyId((data?.company_id as string) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  // Réinitialise l'état à la fermeture
  useEffect(() => {
    if (open) return;
    setActiveVoiceCallId(null);
    setVoiceCall(null);
    setStatus("voicemail");
    setCallbackDays(1);
    setNotes("");
  }, [open]);

  // === Volet 1 : enregistrement du résultat ===
  const handleSaveLog = async () => {
    if (!companyId) {
      toast.error("Impossible de déterminer l'entreprise");
      return;
    }
    setSavingLog(true);
    try {
      let callbackDate: string | null = null;
      if (status !== "reached" && callbackDays !== null) {
        callbackDate = format(addDays(new Date(), callbackDays), "yyyy-MM-dd");
      }
      const { error } = await db.from("offer_call_logs").insert({
        offer_id: offerId,
        company_id: companyId,
        status,
        callback_date: callbackDate,
        notes: notes.trim() || null,
        called_at: new Date().toISOString(),
        created_by: user?.id,
      });
      if (error) throw error;
      toast.success(
        status === "reached"
          ? "Appel enregistré — Client joint"
          : "Appel enregistré, rappel programmé"
      );
      onLogged?.();
      setNotes("");
    } catch (e) {
      console.error("save log error", e);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSavingLog(false);
    }
  };

  // === Volet 2 : démarrage de l'appel softphone ===
  const handleCall = async () => {
    if (!clientPhone) {
      toast.error("Aucun numéro de téléphone");
      return;
    }
    if (!companyId) {
      toast.error("Entreprise inconnue");
      return;
    }
    setStarting(true);
    try {
      const { data, error } = await db
        .from("voice_calls")
        .insert({
          company_id: companyId,
          client_id: clientId ?? null,
          offer_id: offerId,
          direction: "outbound",
          to_phone: clientPhone,
          status: "ringing",
          provider: "twilio_softphone",
          initiated_by: user?.id,
          language: "fr",
        })
        .select("id")
        .single();
      if (error) throw error;
      const voiceCallId = data?.id as string;
      setActiveVoiceCallId(voiceCallId);
      await softphone.call(clientPhone, { voiceCallId });
    } catch (e) {
      console.error("start call error", e);
      toast.error("Impossible de démarrer l'appel");
    } finally {
      setStarting(false);
    }
  };

  const handleMute = () => {
    softphone.toggleMute();
  };

  // === Volet 3 : chargement + realtime de la ligne voice_calls ===
  useEffect(() => {
    if (!activeVoiceCallId) return;
    let cancelled = false;

    (async () => {
      const { data } = await db
        .from("voice_calls")
        .select("*")
        .eq("id", activeVoiceCallId)
        .single();
      if (!cancelled && data) setVoiceCall(data as VoiceCallRow);
    })();

    const channel = db
      .channel("vc_" + activeVoiceCallId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "voice_calls",
          filter: "id=eq." + activeVoiceCallId,
        },
        (payload: { new: VoiceCallRow }) => {
          setVoiceCall(payload.new);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      db.removeChannel(channel);
    };
  }, [activeVoiceCallId]);

  const handleTranscribe = async () => {
    if (!activeVoiceCallId) return;
    setTranscribing(true);
    try {
      const { error } = await db.functions.invoke("voice-transcribe", {
        body: { voice_call_id: activeVoiceCallId },
      });
      if (error) throw error;
      toast.success("Transcription lancée");
    } catch (e) {
      console.error("transcribe error", e);
      toast.error("Échec du lancement de la transcription");
    } finally {
      setTranscribing(false);
    }
  };

  // === Actions IA / manuelles ===
  const createTask = useCallback(
    async (payload: AiAction["payload"]) => {
      if (!companyId) {
        toast.error("Entreprise inconnue");
        return;
      }
      const priority = ["low", "medium", "high"].includes(
        String(payload.priority)
      )
        ? (payload.priority as string)
        : "medium";
      const { error } = await db.from("tasks").insert({
        company_id: companyId,
        title: payload.title ?? "Tâche de suivi",
        description: payload.description ?? null,
        due_date: addDays(new Date(), payload.due_in_days ?? 3).toISOString(),
        priority,
        status: "todo",
        related_offer_id: offerId,
        related_client_id: clientId ?? null,
        created_by: user?.id,
      });
      if (error) {
        console.error("task error", error);
        toast.error("Erreur lors de la création de la tâche");
        return;
      }
      toast.success("Tâche créée");
    },
    [companyId, offerId, clientId, user?.id]
  );

  const createCallback = useCallback(
    async (inDays: number, reason?: string) => {
      if (!companyId) {
        toast.error("Entreprise inconnue");
        return;
      }
      const { error } = await db.from("offer_call_logs").insert({
        offer_id: offerId,
        company_id: companyId,
        status: "reached",
        callback_date: addDays(new Date(), inDays).toISOString(),
        notes: reason ?? null,
        called_at: new Date().toISOString(),
        created_by: user?.id,
      });
      if (error) {
        console.error("callback error", error);
        toast.error("Erreur lors de la planification du rappel");
        return;
      }
      toast.success("Rappel planifié");
      onLogged?.();
    },
    [companyId, offerId, user?.id, onLogged]
  );

  const callbackWithAlex = useCallback(
    async (missingDocs?: string) => {
      if (!clientId) {
        toast.error("Aucun client lié");
        return;
      }
      try {
        const { error } = await db.functions.invoke("voice-call-start", {
          body: {
            client_id: clientId,
            offer_id: offerId,
            language: "fr",
            missing_docs: missingDocs ?? "",
          },
        });
        if (error) {
          // supabase-js masque le corps de la réponse non-2xx dans error.context
          // (un objet Response) → on l'extrait pour connaître la vraie cause.
          let serverMsg = "";
          let status: number | undefined;
          try {
            const ctx = (error as { context?: Response }).context;
            if (ctx && typeof ctx.json === "function") {
              status = ctx.status;
              const body = await ctx.json();
              serverMsg = body?.error ?? "";
            }
          } catch {
            /* corps non-JSON, on retombe sur error.message */
          }
          throw Object.assign(new Error(serverMsg || (error as Error).message), { status });
        }
        toast.success("Alex (agent IA) va rappeler le client");
      } catch (e) {
        console.error("voice-call-start error", e);
        const msg = e instanceof Error ? e.message : String(e);
        if (/consent/i.test(msg)) {
          toast.error(
            "Le client n'a pas donné son consentement aux appels IA (RGPD). Activez-le dans la fiche client."
          );
        } else if (/phone|numéro/i.test(msg)) {
          toast.error("Le client n'a pas de numéro de téléphone valide.");
        } else if (/not configured|env var/i.test(msg)) {
          toast.info("Agent vocal IA à configurer (ElevenLabs).");
        } else if (/rate.?limit|too many|429/i.test(msg)) {
          toast.error("Trop d'appels Alex aujourd'hui (limite atteinte). Réessayez demain.");
        } else {
          toast.error(`Échec de l'appel Alex : ${msg}`);
        }
      }
    },
    [clientId, offerId]
  );

  const runAiAction = useCallback(
    (action: AiAction) => {
      switch (action.kind) {
        case "task":
          createTask(action.payload);
          break;
        case "link_offer":
          toast.info("Déjà rattaché à cette demande");
          break;
        case "callback":
          createCallback(action.payload.in_days ?? 3, action.payload.reason);
          break;
        case "callback_ai":
          callbackWithAlex(action.payload.reason);
          break;
        default:
          break;
      }
    },
    [createTask, createCallback, callbackWithAlex]
  );

  const statusLabel = useMemo(() => {
    switch (softphone.status) {
      case "connecting":
        return "Connexion…";
      case "ringing":
        return "Sonne…";
      case "in_call":
        return "En communication";
      case "ended":
        return "Terminé";
      case "error":
        return "Erreur";
      default:
        return "Prêt";
    }
  }, [softphone.status]);

  const inActiveCall =
    softphone.status === "connecting" ||
    softphone.status === "ringing" ||
    softphone.status === "in_call";

  const aiActions: AiAction[] = Array.isArray(voiceCall?.ai_actions)
    ? (voiceCall?.ai_actions as AiAction[])
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-sky-600" />
            Gestion d'appel client
            {clientName && (
              <span className="text-sm font-normal text-muted-foreground">
                — {clientName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ===================== VOLET 1 ===================== */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-sky-600" />
              Résultat d'appel
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setStatus(opt.value);
                      setCallbackDays(opt.value === "reached" ? null : 1);
                    }}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 text-[11px] font-medium transition-all ${
                      selected
                        ? opt.color === "amber"
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : opt.color === "red"
                          ? "border-red-400 bg-red-50 text-red-700"
                          : "border-green-400 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-center leading-tight">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {status !== "reached" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  Rappeler dans
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {CALLBACK_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setCallbackDays(opt.days)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                        callbackDays === opt.days
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-sky-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium">Templates rapides</Label>
              <div className="flex flex-wrap gap-1.5">
                {NOTE_TEMPLATES[status].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setNotes(tpl)}
                    className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all text-left ${
                      notes === tpl
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-sky-300"
                    }`}
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Note</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Détails de l'appel…"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            <Button
              onClick={handleSaveLog}
              disabled={savingLog}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white"
            >
              {savingLog ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>

          {/* ===================== VOLET 2 ===================== */}
          <div className="space-y-4 lg:border-l lg:border-r lg:px-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              Softphone
            </h3>

            {clientPhone ? (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Numéro</p>
                <p className="text-lg font-semibold tracking-wide">
                  {clientPhone}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun numéro
              </p>
            )}

            {/* Indicateur d'état */}
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className={`text-xs ${
                  softphone.status === "in_call"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : softphone.status === "error"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {statusLabel}
              </Badge>
            </div>

            {/* Timer */}
            {inActiveCall && (
              <div className="text-center text-2xl font-mono font-semibold">
                {formatDuration(softphone.callDurationSec)}
              </div>
            )}

            {/* Boutons d'appel */}
            {!inActiveCall ? (
              <Button
                onClick={handleCall}
                disabled={!clientPhone || starting || !softphone.ready}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {starting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Phone className="w-4 h-4 mr-2" />
                )}
                Appeler
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleMute}
                  className="flex-1"
                >
                  {softphone.isMuted ? (
                    <MicOff className="w-4 h-4 mr-2" />
                  ) : (
                    <Mic className="w-4 h-4 mr-2" />
                  )}
                  {softphone.isMuted ? "Activer" : "Muet"}
                </Button>
                <Button
                  onClick={() => softphone.hangup()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  Raccrocher
                </Button>
              </div>
            )}

            {softphone.error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5">
                {softphone.error}
              </p>
            )}
          </div>

          {/* ===================== VOLET 3 ===================== */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              Transcription & actions IA
            </h3>

            {/* Statut transcription */}
            {!voiceCall?.recording_path && !voiceCall?.transcription ? (
              <p className="text-xs text-muted-foreground bg-slate-50 rounded px-2 py-2">
                L'enregistrement et la transcription apparaîtront après l'appel.
              </p>
            ) : voiceCall?.transcription ? (
              <ScrollArea className="h-40 rounded border bg-white p-2">
                <p className="text-xs whitespace-pre-wrap text-slate-700">
                  {voiceCall.transcription}
                </p>
              </ScrollArea>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Transcription en cours…
              </div>
            )}

            {/* Résumé */}
            {voiceCall?.summary && (
              <div className="rounded border border-violet-200 bg-violet-50 px-2.5 py-2">
                <p className="text-[10px] font-semibold text-violet-700 uppercase tracking-wide mb-1">
                  Résumé
                </p>
                <p className="text-xs text-violet-900 whitespace-pre-wrap">
                  {voiceCall.summary}
                </p>
              </div>
            )}

            {/* Transcrire maintenant */}
            {voiceCall?.recording_path && !voiceCall?.transcription && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTranscribe}
                disabled={transcribing}
                className="w-full"
              >
                {transcribing ? (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 mr-2" />
                )}
                Transcrire maintenant
              </Button>
            )}

            {/* Actions IA suggérées */}
            {aiActions.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions suggérées
                </p>
                {aiActions.map((action, i) => (
                  <Card key={i} className="border-violet-100">
                    <CardContent className="p-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium capitalize">
                          {action.kind === "task"
                            ? action.payload.title ?? "Tâche"
                            : action.kind === "callback"
                            ? "Rappel à planifier"
                            : action.kind === "callback_ai"
                            ? "Rappel agent IA"
                            : "Lier à l'offre"}
                        </p>
                        {(action.reason || action.payload.reason) && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {action.reason ?? action.payload.reason}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-7 text-xs"
                        onClick={() => runAiAction(action)}
                      >
                        Faire
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Actions manuelles */}
            <Separator />
            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() =>
                  createTask({
                    title: "Suivi suite à l'appel",
                    due_in_days: 3,
                  })
                }
              >
                <CheckSquare className="w-3.5 h-3.5 mr-2" />
                Créer une tâche
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => createCallback(3, "Rappel manuel")}
              >
                <Clock className="w-3.5 h-3.5 mr-2" />
                Planifier un rappel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => callbackWithAlex()}
              >
                <Bot className="w-3.5 h-3.5 mr-2" />
                Rappeler avec Alex
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientCallModal;
