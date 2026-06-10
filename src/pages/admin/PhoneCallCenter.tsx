import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneCall,
  Mic,
  MicOff,
  Search,
  Delete,
  User,
  UserPlus,
  Building2,
  Mail,
  ExternalLink,
  FileText,
  ClipboardList,
  CheckSquare,
  MessageSquare,
  Sparkles,
  Loader2,
  Plus,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { useSoftphone } from "@/hooks/useSoftphone";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------------
// Types locaux (le client supabase n'est pas typé sur ces tables)
// ----------------------------------------------------------------------------
interface ClientRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
}

interface VoiceCallRow {
  id: string;
  company_id: string;
  client_id: string | null;
  offer_id: string | null;
  direction: "inbound" | "outbound";
  to_phone: string | null;
  status: string | null;
  provider: string | null;
  transcription: string | null;
  summary: string | null;
  recording_path: string | null;
  duration_seconds: number | null;
  created_at: string;
}

interface OfferRow {
  id: string;
  client_id: string | null;
  client_name: string | null;
  offer_number: string | null;
  dossier_number: string | null;
  workflow_status: string | null;
  monthly_payment: number | null;
  created_at: string;
}

interface ContractRow {
  id: string;
  client_id: string | null;
  status: string | null;
  created_at: string | null;
}

interface TaskRow {
  id: string;
  related_client_id: string | null;
  title: string | null;
  status: string | null;
  due_date: string | null;
}

interface ChatConversationRow {
  id: string;
  client_id: string | null;
  channel: string | null;
  client_phone: string | null;
  status: string | null;
  updated_at: string | null;
}

const db = supabase as unknown as {
  from: (table: string) => any;
  channel: (name: string) => any;
  removeChannel: (channel: unknown) => void;
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
/** Normalise un numéro belge simple en E.164. */
function normalizeBeE164(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+32" + cleaned.slice(1);
  if (cleaned === "") return "";
  return "+32" + cleaned;
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return format(new Date(iso), "dd/MM HH:mm", { locale: fr });
  } catch {
    return "";
  }
}

const STATUS_LABEL: Record<string, string> = {
  connecting: "Connexion…",
  ringing: "Sonne…",
  in_call: "En communication",
  ended: "Appel terminé",
  error: "Erreur",
  idle: "",
};

// Statuts stockés des appels → libellé FR pour l'historique.
const CALL_STATUS_FR: Record<string, string> = {
  ringing: "Sonné",
  in_progress: "En cours",
  completed: "Terminé",
  no_answer: "Sans réponse",
  busy: "Occupé",
  failed: "Échec",
  canceled: "Annulé",
};

// ----------------------------------------------------------------------------
// Composant principal
// ----------------------------------------------------------------------------
export default function PhoneCallCenter() {
  const { user } = useAuth();
  const { companyId } = useMultiTenant();
  const { navigateToAdmin } = useRoleNavigation();
  const queryClient = useQueryClient();
  const sp = useSoftphone(true, { receiveIncoming: true });

  const [phoneNumber, setPhoneNumber] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [activeVoiceCallId, setActiveVoiceCallId] = useState<string | null>(null);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const inCall =
    sp.status === "connecting" || sp.status === "ringing" || sp.status === "in_call";

  // --------------------------------------------------------------------------
  // PRÉSENCE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!user?.id || !companyId || !sp.identity) return;

    const upsertPresence = async () => {
      await db.from("voice_presence").upsert(
        {
          user_id: user.id,
          company_id: companyId,
          identity: sp.identity,
          online: true,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    };

    upsertPresence();
    const interval = setInterval(upsertPresence, 30000);

    return () => {
      clearInterval(interval);
      db.from("voice_presence")
        .update({ online: false, last_seen: new Date().toISOString() })
        .eq("user_id", user.id);
    };
  }, [user?.id, companyId, sp.identity]);

  // --------------------------------------------------------------------------
  // Chargement d'un client (sélection contexte droite)
  // --------------------------------------------------------------------------
  const loadClientById = useCallback(async (clientId: string) => {
    const { data } = await db
      .from("clients")
      .select("id, name, email, phone, company_name")
      .eq("id", clientId)
      .maybeSingle();
    if (data) setSelectedClient(data as ClientRow);
  }, []);

  // --------------------------------------------------------------------------
  // Appel entrant : charger automatiquement le contexte client
  // --------------------------------------------------------------------------
  const handledIncomingRef = useRef<string | null>(null);
  useEffect(() => {
    if (!sp.incoming) {
      handledIncomingRef.current = null;
      return;
    }
    const key = sp.incoming.from + JSON.stringify(sp.incoming.params);
    if (handledIncomingRef.current === key) return;
    handledIncomingRef.current = key;

    const clientId = sp.incoming.params.clientId;
    const voiceCallId = sp.incoming.params.voiceCallId;
    if (voiceCallId) setActiveVoiceCallId(voiceCallId);
    if (clientId) {
      loadClientById(clientId);
    } else {
      setPhoneNumber(sp.incoming.from);
    }
    toast.info(`Appel entrant de ${sp.incoming.from}`);
  }, [sp.incoming, loadClientById]);

  // --------------------------------------------------------------------------
  // Réaltime sur la ligne voice_calls active (transcription / résumé)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!activeVoiceCallId) return;
    const channel = db
      .channel(`voice_call_${activeVoiceCallId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "voice_calls",
          filter: `id=eq.${activeVoiceCallId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["voice-call", activeVoiceCallId] });
          queryClient.invalidateQueries({ queryKey: ["recent-calls", companyId] });
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [activeVoiceCallId, companyId, queryClient]);

  // --------------------------------------------------------------------------
  // Queries — recherche client
  // --------------------------------------------------------------------------
  const { data: searchResults = [], isFetching: searching } = useQuery<ClientRow[]>({
    queryKey: ["client-search", companyId, clientSearch],
    enabled: !!companyId && clientSearch.trim().length >= 2,
    queryFn: async () => {
      const q = clientSearch.trim();
      // Échappe les caractères spéciaux PostgREST pour le filtre .or().
      const term = `%${q.replace(/[%,()]/g, " ")}%`;
      const digits = q.replace(/\D/g, "");

      // Recherche texte : nom, société, email, téléphone (brut).
      const textP = db
        .from("clients")
        .select("id, name, email, phone, company_name")
        .eq("company_id", companyId)
        .or(`name.ilike.${term},company_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
        .order("name")
        .limit(20);

      // Recherche numéro (insensible au format, via la RPC) si ≥ 4 chiffres.
      const phoneP =
        digits.length >= 4
          ? db.rpc("find_clients_by_phone", { p_company_id: companyId, p_phone: q })
          : Promise.resolve({ data: [] });

      const [textRes, phoneRes] = await Promise.all([textP, phoneP]);
      const merged = new Map<string, ClientRow>();
      for (const c of ([...(phoneRes.data ?? []), ...(textRes.data ?? [])] as ClientRow[])) {
        if (!merged.has(c.id)) merged.set(c.id, c);
      }
      return Array.from(merged.values()).slice(0, 20);
    },
  });

  // Appels récents
  const { data: recentCalls = [], isLoading: loadingRecent } = useQuery<VoiceCallRow[]>({
    queryKey: ["recent-calls", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await db
        .from("voice_calls")
        .select(
          "id, company_id, client_id, offer_id, direction, to_phone, status, provider, transcription, summary, recording_path, duration_seconds, created_at"
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(15);
      return (data as VoiceCallRow[]) ?? [];
    },
  });

  // Ligne voice_call active (transcription/résumé)
  const { data: activeCall } = useQuery<VoiceCallRow | null>({
    queryKey: ["voice-call", activeVoiceCallId],
    enabled: !!activeVoiceCallId,
    queryFn: async () => {
      const { data } = await db
        .from("voice_calls")
        .select(
          "id, company_id, client_id, offer_id, direction, to_phone, status, provider, transcription, summary, recording_path, duration_seconds, created_at"
        )
        .eq("id", activeVoiceCallId)
        .maybeSingle();
      return (data as VoiceCallRow) ?? null;
    },
  });

  const selectedClientId = selectedClient?.id ?? null;

  // Contexte CRM (en parallèle)
  const { data: offers = [], isLoading: loadingOffers } = useQuery<OfferRow[]>({
    queryKey: ["client-offers", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const { data } = await db
        .from("offers")
        .select(
          "id, client_id, client_name, offer_number, dossier_number, workflow_status, monthly_payment, created_at"
        )
        .eq("client_id", selectedClientId)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data as OfferRow[]) ?? [];
    },
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery<ContractRow[]>({
    queryKey: ["client-contracts", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const { data } = await db
        .from("contracts")
        .select("id, client_id, status, created_at")
        .eq("client_id", selectedClientId)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data as ContractRow[]) ?? [];
    },
  });

  const { data: clientTasks = [], isLoading: loadingTasks } = useQuery<TaskRow[]>({
    queryKey: ["client-tasks", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const { data } = await db
        .from("tasks")
        .select("id, related_client_id, title, status, due_date")
        .eq("related_client_id", selectedClientId)
        .neq("status", "done")
        .limit(10);
      return (data as TaskRow[]) ?? [];
    },
  });

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<
    ChatConversationRow[]
  >({
    queryKey: ["client-conversations", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const { data } = await db
        .from("chat_conversations")
        .select("id, client_id, channel, client_phone, status, updated_at")
        .eq("client_id", selectedClientId)
        .order("updated_at", { ascending: false })
        .limit(10);
      return (data as ChatConversationRow[]) ?? [];
    },
  });

  // --------------------------------------------------------------------------
  // Actions dialpad
  // --------------------------------------------------------------------------
  const appendDigit = useCallback((d: string) => {
    setPhoneNumber((p) => p + d);
  }, []);

  const backspace = useCallback(() => {
    setPhoneNumber((p) => p.slice(0, -1));
  }, []);

  // Recherche d'un client par téléphone, insensible au format (RPC qui
  // compare les 9 derniers chiffres). Déclaré AVANT placeCall qui l'utilise.
  const findClientByPhone = useCallback(async (raw: string): Promise<ClientRow | null> => {
    if (!raw.trim() || !companyId) return null;
    const { data } = await db.rpc("find_clients_by_phone", { p_company_id: companyId, p_phone: raw });
    return ((data as ClientRow[]) ?? [])[0] ?? null;
  }, [companyId]);

  // Passe un appel vers `rawNumber` (sans dépendre de l'état pour éviter les
  // courses) ; associe le client connu ou le retrouve par son numéro.
  const placeCall = useCallback(async (rawNumber: string, knownClient?: ClientRow | null) => {
    if (!rawNumber.trim() || !companyId || !user?.id) return;
    const e164 = normalizeBeE164(rawNumber);
    if (!e164) return;
    setPhoneNumber(rawNumber);

    let client = knownClient ?? selectedClient;
    if (!client) {
      const found = await findClientByPhone(rawNumber);
      if (found) { client = found; setSelectedClient(found); }
    } else {
      setSelectedClient(client);
    }

    try {
      const { data, error } = await db
        .from("voice_calls")
        .insert({
          company_id: companyId,
          direction: "outbound",
          to_phone: e164,
          status: "ringing",
          provider: "twilio_softphone",
          initiated_by: user.id,
          language: "fr",
          client_id: client?.id ?? null,
        })
        .select("id")
        .maybeSingle();

      if (error) throw error;
      const voiceCallId = (data as { id: string } | null)?.id ?? null;
      if (voiceCallId) setActiveVoiceCallId(voiceCallId);

      await sp.call(e164, voiceCallId ? { voiceCallId } : undefined);
      queryClient.invalidateQueries({ queryKey: ["recent-calls", companyId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de démarrer l'appel");
    }
  }, [companyId, user?.id, selectedClient, findClientByPhone, sp, queryClient]);

  const handleCall = useCallback(() => { void placeCall(phoneNumber, selectedClient); }, [placeCall, phoneNumber, selectedClient]);

  const handleSelectClient = useCallback((c: ClientRow) => {
    setSelectedClient(c);
    setShowClientSearch(false);
    if (c.phone) setPhoneNumber(c.phone);
  }, []);

  const handleAcceptIncoming = useCallback(() => {
    const params = sp.incoming?.params;
    sp.acceptIncoming();
    if (params?.voiceCallId) setActiveVoiceCallId(params.voiceCallId);
    if (params?.clientId) loadClientById(params.clientId);
  }, [sp, loadClientById]);

  const handleRecentClick = useCallback(
    (call: VoiceCallRow) => {
      if (call.to_phone) setPhoneNumber(call.to_phone);
      if (call.client_id) loadClientById(call.client_id);
      setActiveVoiceCallId(call.id);
    },
    [loadClientById]
  );

  const handleTranscribe = useCallback(async () => {
    if (!activeVoiceCallId) return;
    setTranscribing(true);
    try {
      const { error } = await supabase.functions.invoke("voice-transcribe", {
        body: { voice_call_id: activeVoiceCallId },
      });
      if (error) throw error;
      toast.success("Transcription lancée");
      queryClient.invalidateQueries({ queryKey: ["voice-call", activeVoiceCallId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la transcription");
    } finally {
      setTranscribing(false);
    }
  }, [activeVoiceCallId, queryClient]);

  // Crée une tâche de suivi — liée au client si connu, sinon au numéro seul.
  const handleCreateTask = useCallback(async () => {
    if (!companyId || !user?.id) return;
    setCreatingTask(true);
    try {
      const label = selectedClient?.name ?? phoneNumber ?? "appel";
      const { error } = await db.from("tasks").insert({
        related_client_id: selectedClient?.id ?? null,
        company_id: companyId,
        title: `Suivi appel — ${label}`.trim(),
        description: phoneNumber ? `Appel ${phoneNumber}` : null,
        status: "todo",
        created_by: user.id,
      });
      if (error) throw error;
      toast.success("Tâche créée");
      if (selectedClient?.id) queryClient.invalidateQueries({ queryKey: ["client-tasks", selectedClient.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de créer la tâche");
    } finally {
      setCreatingTask(false);
    }
  }, [selectedClient, companyId, user?.id, phoneNumber, queryClient]);

  // --- Message rapide (WhatsApp/SMS) depuis la console ---
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [msgChannel, setMsgChannel] = useState<"auto" | "whatsapp" | "sms">("sms");
  const [msgSending, setMsgSending] = useState(false);

  const sendQuickMessage = useCallback(async () => {
    if (!msgText.trim()) return;
    setMsgSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("messaging-send", {
        body: {
          action: "send_message",
          client_id: selectedClient?.id ?? undefined,
          channel: msgChannel,
          text: msgText.trim(),
        },
      });
      let body = (data ?? null) as { success?: boolean; error?: string; message?: string } | null;
      if (error) {
        const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
        if (ctx?.json) { try { body = (await ctx.json()) as typeof body; } catch { /* */ } }
      }
      if (!body?.success) {
        if (body?.error === "window_closed") {
          toast.error("Fenêtre WhatsApp fermée (24 h) — envoyez plutôt un SMS, ou un template.");
        } else {
          toast.error(body?.message ?? body?.error ?? "Envoi impossible");
        }
        return;
      }
      toast.success(`Message ${msgChannel === "sms" ? "SMS" : msgChannel === "whatsapp" ? "WhatsApp" : ""} envoyé`);
      setMsgOpen(false);
      setMsgText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setMsgSending(false);
    }
  }, [msgText, msgChannel, selectedClient?.id]);

  // Micro : autorisation explicite (utile dans une fenêtre PWA où le prompt
  // n'apparaît pas tout seul).
  const [micState, setMicState] = useState<"unknown" | "granted" | "denied">("unknown");
  const requestMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicState("granted");
      toast.success("Micro autorisé ✅ Vous pouvez appeler.");
    } catch {
      setMicState("denied");
      toast.error("Micro refusé. Réglages macOS → Confidentialité → Microphone (autorisez votre navigateur), puis l'icône 🔒 de la barre d'adresse → Microphone : Autoriser.", { duration: 12000 });
    }
  }, []);

  const handleSearchByNumber = useCallback(async () => {
    if (!phoneNumber.trim() || !companyId) return;
    const found = await findClientByPhone(phoneNumber);
    if (found) {
      setSelectedClient(found);
      toast.success(`Client trouvé : ${found.name ?? ""}`);
    } else {
      toast.info("Aucun client avec ce numéro");
    }
  }, [phoneNumber, companyId, findClientByPhone]);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  const dialpadKeys = useMemo<{ d: string; sub?: string }[]>(
    () => [
      { d: "1" }, { d: "2", sub: "ABC" }, { d: "3", sub: "DEF" },
      { d: "4", sub: "GHI" }, { d: "5", sub: "JKL" }, { d: "6", sub: "MNO" },
      { d: "7", sub: "PQRS" }, { d: "8", sub: "TUV" }, { d: "9", sub: "WXYZ" },
      { d: "*" }, { d: "0", sub: "+" }, { d: "#" },
    ],
    []
  );

  const incomingClientName =
    sp.incoming?.params.clientName ?? selectedClient?.name ?? null;

  const initials = (name?: string | null) =>
    (name ?? "").trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="h-[calc(100vh-72px)] flex flex-col gap-4 p-4 sm:p-6 max-w-[1600px] mx-auto w-full">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-500/30">
            <PhoneCall className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Centre d'appels</h1>
            <p className="text-sm text-muted-foreground">
              Appels entrants & sortants, contexte client en direct.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={requestMic}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              micState === "granted"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : micState === "denied"
                ? "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
            title="Autoriser le microphone (requis pour appeler)"
          >
            <Mic className="h-3.5 w-3.5" />
            {micState === "granted" ? "Micro OK" : micState === "denied" ? "Micro refusé" : "Activer le micro"}
          </button>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
              sp.ready
                ? "bg-emerald-600 text-white"
                : "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
            )}
          >
            <span className={cn("h-2 w-2 rounded-full bg-current", sp.ready && "animate-pulse")} />
            {sp.ready ? "En ligne" : "Connexion…"}
          </span>
        </div>
      </div>

      {/* Layout 3 colonnes */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* COLONNE GAUCHE */}
        <div className="w-[340px] shrink-0 flex flex-col gap-4 min-h-0">
          <Card className="shrink-0 overflow-hidden">
            <CardContent className="p-4 space-y-4">
              {/* Écran du numéroteur */}
              <div className="rounded-2xl bg-muted/60 px-4 py-3.5 flex items-center gap-2">
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Saisir un numéro"
                  className="flex-1 min-w-0 bg-transparent text-center text-2xl font-semibold tracking-wide tabular-nums outline-none placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground"
                />
                {phoneNumber && (
                  <button
                    onClick={backspace}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    title="Effacer"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Clavier */}
              <div className="grid grid-cols-3 gap-2.5">
                {dialpadKeys.map((k) => (
                  <button
                    key={k.d}
                    onClick={() => appendDigit(k.d)}
                    className="group h-14 rounded-2xl bg-muted/40 hover:bg-accent active:scale-95 transition-all flex flex-col items-center justify-center"
                  >
                    <span className="text-xl font-semibold leading-none">{k.d}</span>
                    {k.sub && (
                      <span className="text-[9px] tracking-widest text-muted-foreground mt-0.5">
                        {k.sub}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Bouton appeler */}
              <Button
                size="lg"
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-base shadow-sm shadow-emerald-600/30"
                onClick={handleCall}
                disabled={!phoneNumber.trim() || inCall || !sp.ready}
              >
                <Phone className="h-5 w-5 mr-2" /> Appeler
              </Button>
              {micState !== "granted" && (
                <p className="text-[11px] text-center text-muted-foreground">
                  Pensez à <button onClick={requestMic} className="underline font-medium">activer le micro</button> avant d'appeler.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recherche + appels récents */}
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-base">Annuaire & récents</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col space-y-3">
              <div className="relative shrink-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Rechercher un client"
                  className="pl-8"
                />
              </div>

              <ScrollArea className="flex-1 min-h-0 -mr-2 pr-2">
                {clientSearch.trim().length >= 2 ? (
                  <div className="space-y-1">
                    {searching && (
                      <p className="text-sm text-muted-foreground py-2 flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recherche…
                      </p>
                    )}
                    {!searching && searchResults.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <Search className="h-7 w-7 mx-auto opacity-30 mb-2" />
                        <p className="text-sm">Aucun résultat pour « {clientSearch.trim()} »</p>
                      </div>
                    )}
                    {!searching && searchResults.length > 0 && (
                      <p className="text-[11px] text-muted-foreground px-1 pb-1">
                        {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
                      </p>
                    )}
                    {searchResults.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectClient(c)}
                        className="group w-full rounded-xl p-2 transition-colors hover:bg-accent cursor-pointer flex items-center gap-2.5"
                      >
                        <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white flex items-center justify-center text-xs font-bold">
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate text-[13px]">{c.name ?? "Sans nom"}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {c.company_name ? c.company_name : c.email ?? ""}
                          </div>
                          {c.phone && (
                            <div className="text-[11px] text-muted-foreground truncate font-mono">{c.phone}</div>
                          )}
                        </div>
                        {c.phone ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); void placeCall(c.phone as string, c); }}
                            disabled={inCall || !sp.ready}
                            className="shrink-0 h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                            title={`Appeler ${c.phone}`}
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="shrink-0 text-[10px] text-muted-foreground">pas de n°</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-1">
                      Appels récents
                    </p>
                    {loadingRecent && (
                      <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    )}
                    {!loadingRecent && recentCalls.length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">
                        Aucun appel récent.
                      </p>
                    )}
                    {recentCalls.map((call) => (
                      <button
                        key={call.id}
                        onClick={() => handleRecentClick(call)}
                        className="w-full text-left rounded-xl p-2 text-sm hover:bg-accent transition-colors flex items-center gap-2.5"
                      >
                        <span
                          className={cn(
                            "h-8 w-8 shrink-0 rounded-full flex items-center justify-center",
                            call.direction === "inbound" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                          )}
                        >
                          {call.direction === "inbound" ? (
                            <PhoneIncoming className="h-4 w-4" />
                          ) : (
                            <PhoneOutgoing className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium font-mono text-[13px]">
                            {call.to_phone ?? "Inconnu"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {fmtTime(call.created_at)}
                            {call.status ? ` · ${CALL_STATUS_FR[call.status] ?? call.status}` : ""}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* COLONNE CENTRE */}
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {sp.incoming && !inCall ? (
            // ---------- APPEL ENTRANT ----------
            <div className="flex-1 flex flex-col items-center justify-center gap-7 bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                <PhoneIncoming className="h-3.5 w-3.5" /> Appel entrant
              </span>
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
                <div className="relative h-28 w-28 rounded-full bg-white/15 ring-4 ring-white/30 flex items-center justify-center text-3xl font-bold">
                  {incomingClientName ? initials(incomingClientName) : <PhoneIncoming className="h-12 w-12" />}
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{incomingClientName ?? "Numéro inconnu"}</p>
                <p className="text-white/80 font-mono mt-1">{sp.incoming.from}</p>
              </div>
              <div className="flex items-center gap-6">
                <button
                  onClick={sp.rejectIncoming}
                  className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center shadow-lg"
                  title="Refuser"
                >
                  <PhoneOff className="h-7 w-7" />
                </button>
                <button
                  onClick={handleAcceptIncoming}
                  className="h-16 w-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center shadow-lg animate-bounce"
                  title="Décrocher"
                >
                  <Phone className="h-7 w-7" />
                </button>
              </div>
            </div>
          ) : inCall ? (
            // ---------- APPEL EN COURS ----------
            <div
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-7 p-8 text-white transition-colors",
                sp.status === "in_call"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                  : "bg-gradient-to-br from-amber-500 to-orange-600"
              )}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                {sp.status !== "in_call" && <span className="h-2 w-2 rounded-full bg-white animate-pulse" />}
                {STATUS_LABEL[sp.status] ?? ""}
              </span>
              <div className="h-28 w-28 rounded-full bg-white/15 ring-4 ring-white/30 flex items-center justify-center text-3xl font-bold">
                {selectedClient ? initials(selectedClient.name) : <User className="h-12 w-12" />}
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{selectedClient?.name ?? phoneNumber ?? "—"}</p>
                <p className="text-white/80 font-mono mt-1">{phoneNumber}</p>
                {sp.status === "in_call" && (
                  <p className="text-4xl font-bold tabular-nums mt-4">{fmtDuration(sp.callDurationSec)}</p>
                )}
              </div>
              <div className="flex items-center gap-5">
                <button
                  onClick={sp.toggleMute}
                  className={cn(
                    "h-14 w-14 rounded-full active:scale-95 transition-all flex items-center justify-center",
                    sp.isMuted ? "bg-white text-foreground" : "bg-white/20 hover:bg-white/30"
                  )}
                  title={sp.isMuted ? "Réactiver le micro" : "Couper le micro"}
                >
                  {sp.isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </button>
                <button
                  onClick={sp.hangup}
                  className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center shadow-lg"
                  title="Raccrocher"
                >
                  <PhoneOff className="h-7 w-7" />
                </button>
              </div>
              {sp.error && <p className="text-sm bg-white/20 rounded-lg px-3 py-1.5">{sp.error}</p>}
            </div>
          ) : (
            // ---------- AU REPOS ----------
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
              <div className="h-24 w-24 rounded-full bg-muted/60 flex items-center justify-center">
                <PhoneCall className="h-11 w-11 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-lg font-semibold">Prêt à appeler</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Composez un numéro, choisissez un client dans l'annuaire, ou recevez un appel entrant.
                </p>
              </div>
              {micState !== "granted" && (
                <Button onClick={requestMic} variant="outline" className="rounded-full">
                  <Mic className="h-4 w-4 mr-2" /> Activer le micro
                </Button>
              )}
              {sp.error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-1.5">{sp.error}</p>}
            </div>
          )}
        </Card>

        {/* COLONNE DROITE */}
        <Card className="w-[420px] shrink-0 min-h-0 flex flex-col">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-base">Contexte client</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
            <ScrollArea className="h-full px-6 pb-6">
              {!selectedClient ? (
                <div className="space-y-4 pt-2">
                  <div className="rounded-2xl border border-dashed p-5 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                      <User className="h-6 w-6 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-medium">Aucun client associé</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Numéro : <span className="font-mono">{phoneNumber || "—"}</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => setShowClientSearch((v) => !v)} className="rounded-xl">
                      <User className="h-4 w-4 mr-2" /> Associer à un client
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={handleSearchByNumber}
                      disabled={!phoneNumber.trim()}
                    >
                      <Search className="h-4 w-4 mr-2" /> Rechercher ce numéro
                    </Button>
                  </div>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actions rapides
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      className="justify-start rounded-xl"
                      onClick={handleCreateTask}
                      disabled={creatingTask}
                    >
                      {creatingTask ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                      Créer une tâche de suivi
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start rounded-xl"
                      onClick={() => navigateToAdmin("clients?create=1")}
                    >
                      <UserPlus className="h-4 w-4 mr-2" /> Créer une fiche client
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start rounded-xl"
                      onClick={() => navigateToAdmin("create-offer")}
                    >
                      <FileText className="h-4 w-4 mr-2" /> Nouvelle demande
                    </Button>
                  </div>

                  {showClientSearch && (
                    <div className="space-y-2 border rounded-md p-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Nom, email, téléphone"
                          className="pl-8"
                          autoFocus
                        />
                      </div>
                      {searching && (
                        <p className="text-sm text-muted-foreground">Recherche…</p>
                      )}
                      {searchResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectClient(c)}
                          className="w-full text-left rounded-md border p-2 text-sm hover:bg-accent"
                        >
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {c.phone ?? "Aucun téléphone"}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {/* En-tête client */}
                  <div className="rounded-2xl border bg-gradient-to-br from-muted/50 to-transparent p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold">
                        {initials(selectedClient.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-base truncate">{selectedClient.name}</p>
                        {selectedClient.company_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {selectedClient.company_name}
                          </p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setSelectedClient(null)}
                        title="Désassocier"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 space-y-1">
                      {selectedClient.phone && (
                        <p className="text-sm flex items-center gap-2 truncate font-mono">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {selectedClient.phone}
                        </p>
                      )}
                      {selectedClient.email && (
                        <p className="text-sm flex items-center gap-2 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {selectedClient.email}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 rounded-xl"
                      onClick={() => navigateToAdmin("clients/" + selectedClient.id)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir la fiche client
                    </Button>
                  </div>

                  {/* DEMANDES */}
                  <Section
                    icon={<ClipboardList className="h-4 w-4" />}
                    title="Demandes"
                    loading={loadingOffers}
                    empty={offers.length === 0}
                    emptyLabel="Aucune demande."
                  >
                    {offers.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => navigateToAdmin("offers/" + o.id)}
                        className="w-full text-left rounded-md border p-2 text-sm hover:bg-accent flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {o.offer_number ?? o.dossier_number ?? o.id.slice(0, 8)}
                          {o.workflow_status ? ` · ${o.workflow_status}` : ""}
                        </span>
                        {o.monthly_payment != null && (
                          <span className="font-mono shrink-0">
                            {o.monthly_payment} €/m
                          </span>
                        )}
                      </button>
                    ))}
                  </Section>

                  {/* CONTRATS */}
                  <Section
                    icon={<FileText className="h-4 w-4" />}
                    title="Contrats"
                    loading={loadingContracts}
                    empty={contracts.length === 0}
                    emptyLabel="Aucun contrat."
                  >
                    {contracts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => navigateToAdmin("contracts/" + c.id)}
                        className="w-full text-left rounded-md border p-2 text-sm hover:bg-accent flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{c.id.slice(0, 8)}</span>
                        {c.status && (
                          <Badge variant="secondary" className="shrink-0">
                            {c.status}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </Section>

                  {/* TÂCHES */}
                  <Section
                    icon={<CheckSquare className="h-4 w-4" />}
                    title="Tâches"
                    loading={loadingTasks}
                    empty={clientTasks.length === 0}
                    emptyLabel="Aucune tâche en cours."
                  >
                    {clientTasks.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-md border p-2 text-sm flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{t.title}</span>
                        {t.due_date && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {fmtTime(t.due_date)}
                          </span>
                        )}
                      </div>
                    ))}
                  </Section>

                  {/* MESSAGES */}
                  <Section
                    icon={<MessageSquare className="h-4 w-4" />}
                    title="Messages"
                    loading={loadingConversations}
                    empty={conversations.length === 0}
                    emptyLabel="Aucune conversation."
                  >
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="rounded-md border p-2 text-sm flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-2 truncate">
                          {conv.channel && (
                            <Badge variant="outline" className="shrink-0">
                              {conv.channel}
                            </Badge>
                          )}
                          <span className="text-muted-foreground truncate">
                            {conv.status ?? ""}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigateToAdmin("support")}
                        >
                          Ouvrir
                        </Button>
                      </div>
                    ))}
                  </Section>

                  <Separator />

                  {/* Transcription */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Transcription
                      </p>
                      {activeVoiceCallId &&
                        activeCall?.recording_path &&
                        !activeCall?.transcription && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleTranscribe}
                            disabled={transcribing}
                          >
                            {transcribing ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            Transcrire l'appel
                          </Button>
                        )}
                    </div>
                    {activeCall?.summary && (
                      <div className="rounded-md border bg-muted/40 p-2 text-sm">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Résumé
                        </p>
                        {activeCall.summary}
                      </div>
                    )}
                    {activeCall?.transcription && (
                      <div className="rounded-md border p-2 text-sm whitespace-pre-wrap max-h-40 overflow-auto">
                        {activeCall.transcription}
                      </div>
                    )}
                    {!activeCall?.transcription && !activeCall?.summary && (
                      <p className="text-sm text-muted-foreground">
                        Aucune transcription disponible.
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Actions rapides */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Actions rapides</p>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCreateTask}
                        disabled={creatingTask}
                      >
                        {creatingTask ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Créer une tâche
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setMsgChannel("sms"); setMsgOpen(true); }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" /> Envoyer un WhatsApp/SMS
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigateToAdmin("support")}
                      >
                        <Mail className="h-4 w-4 mr-2" /> Nouvel email
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Modale message rapide (WhatsApp/SMS) avec destinataire préchargé */}
      <Dialog open={msgOpen} onOpenChange={(o) => { setMsgOpen(o); if (!o) setMsgText(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer un message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              À : <span className="font-medium">{selectedClient?.name ?? "—"}</span>
              {(selectedClient?.phone || phoneNumber) && (
                <span className="font-mono text-muted-foreground"> · {selectedClient?.phone ?? phoneNumber}</span>
              )}
            </div>
            <div className="flex gap-2">
              {(["sms", "whatsapp", "auto"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setMsgChannel(ch)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    msgChannel === ch ? "bg-emerald-600 text-white border-emerald-600" : "hover:bg-accent"
                  )}
                >
                  {ch === "sms" ? "SMS" : ch === "whatsapp" ? "WhatsApp" : "Auto"}
                </button>
              ))}
            </div>
            <Textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Votre message…"
              className="min-h-[120px]"
              autoFocus
            />
            {msgChannel === "whatsapp" && (
              <p className="text-xs text-muted-foreground">
                WhatsApp libre nécessite un échange récent (24 h) ; sinon utilisez le SMS.
              </p>
            )}
            {!selectedClient && (
              <p className="text-xs text-amber-600">
                Aucun client associé — associez d'abord un client pour envoyer.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setMsgOpen(false)}>Annuler</Button>
              <Button
                onClick={sendQuickMessage}
                disabled={!msgText.trim() || msgSending || !selectedClient}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {msgSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sous-composant : section CRM compacte
// ----------------------------------------------------------------------------
interface SectionProps {
  icon: React.ReactNode;
  title: string;
  loading: boolean;
  empty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}

function Section({ icon, title, loading, empty, emptyLabel, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium flex items-center gap-2">
        {icon} {title}
      </p>
      {loading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : empty ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  );
}
