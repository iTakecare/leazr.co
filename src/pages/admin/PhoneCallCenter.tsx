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
      const term = `%${clientSearch.trim()}%`;
      const { data } = await db
        .from("clients")
        .select("id, name, email, phone, company_name")
        .eq("company_id", companyId)
        .or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
        .limit(8);
      return (data as ClientRow[]) ?? [];
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

  const handleCall = useCallback(async () => {
    if (!phoneNumber.trim() || !companyId || !user?.id) return;
    const e164 = normalizeBeE164(phoneNumber);
    if (!e164) return;

    // Si aucun client n'est sélectionné, on tente de le retrouver par son
    // numéro (format-agnostique) pour charger son contexte automatiquement.
    let client = selectedClient;
    if (!client) {
      const found = await findClientByPhone(phoneNumber);
      if (found) { client = found; setSelectedClient(found); }
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
      toast.error(
        e instanceof Error ? e.message : "Impossible de démarrer l'appel"
      );
    }
  }, [phoneNumber, companyId, user?.id, selectedClient, findClientByPhone, sp, queryClient]);

  const handleSelectClient = useCallback((c: ClientRow) => {
    setSelectedClient(c);
    setShowClientSearch(false);
    setClientSearch("");
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

  // Recherche d'un client par téléphone, insensible au format (RPC qui
  // compare les 9 derniers chiffres).
  const findClientByPhone = useCallback(async (raw: string): Promise<ClientRow | null> => {
    if (!raw.trim() || !companyId) return null;
    const { data } = await db.rpc("find_clients_by_phone", { p_company_id: companyId, p_phone: raw });
    return ((data as ClientRow[]) ?? [])[0] ?? null;
  }, [companyId]);

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
  const dialpadKeys = useMemo(
    () => ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"],
    []
  );

  const incomingClientName =
    sp.incoming?.params.clientName ?? selectedClient?.name ?? null;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PhoneCall className="h-6 w-6" /> Centre d'appels
          </h1>
          <p className="text-sm text-muted-foreground">
            Passez et recevez des appels, avec le contexte client en direct.
          </p>
        </div>
        {sp.ready && (
          <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            En ligne pour les appels
          </Badge>
        )}
      </div>

      {/* Layout 3 colonnes */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* COLONNE GAUCHE */}
        <div className="w-[320px] shrink-0 flex flex-col gap-4 min-h-0">
          <Card className="shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Composer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Numéro à appeler"
                className="text-center text-lg font-mono tracking-wider"
              />
              <div className="grid grid-cols-3 gap-2">
                {dialpadKeys.map((k) => (
                  <Button
                    key={k}
                    variant="outline"
                    className="h-11 text-lg font-medium"
                    onClick={() => appendDigit(k)}
                  >
                    {k}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  className="h-11 col-span-3"
                  onClick={backspace}
                  disabled={!phoneNumber}
                >
                  <Delete className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleCall}
                disabled={!phoneNumber.trim() || inCall || !sp.ready}
              >
                <Phone className="h-4 w-4 mr-2" /> Appeler
              </Button>
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
                      <p className="text-sm text-muted-foreground py-2">Recherche…</p>
                    )}
                    {!searching && searchResults.length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">
                        Aucun client trouvé.
                      </p>
                    )}
                    {searchResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => c.phone && handleSelectClient(c)}
                        disabled={!c.phone}
                        className={cn(
                          "w-full text-left rounded-md border p-2 text-sm transition-colors",
                          c.phone
                            ? "hover:bg-accent"
                            : "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <div className="font-medium truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.phone ?? "Aucun téléphone"}
                          {c.company_name ? ` · ${c.company_name}` : ""}
                        </div>
                      </button>
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
                        className="w-full text-left rounded-md border p-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                      >
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="h-4 w-4 text-blue-600 shrink-0" />
                        ) : (
                          <PhoneOutgoing className="h-4 w-4 text-green-600 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {call.to_phone ?? "Inconnu"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {fmtTime(call.created_at)}
                            {call.status ? ` · ${call.status}` : ""}
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
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-base">Appel</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            {sp.incoming && !inCall ? (
              <div className="text-center space-y-6 max-w-sm">
                <div className="mx-auto h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                  <PhoneIncoming className="h-9 w-9 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Appel entrant</p>
                  <p className="text-2xl font-semibold font-mono">
                    {sp.incoming.from}
                  </p>
                  {incomingClientName && (
                    <p className="text-base text-muted-foreground mt-1">
                      {incomingClientName}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleAcceptIncoming}
                  >
                    <Phone className="h-4 w-4 mr-2" /> Décrocher
                  </Button>
                  <Button variant="destructive" onClick={sp.rejectIncoming}>
                    <PhoneOff className="h-4 w-4 mr-2" /> Refuser
                  </Button>
                </div>
              </div>
            ) : inCall ? (
              <div className="text-center space-y-6">
                <div
                  className={cn(
                    "mx-auto h-24 w-24 rounded-full flex items-center justify-center",
                    sp.status === "in_call"
                      ? "bg-green-100"
                      : "bg-amber-100 animate-pulse"
                  )}
                >
                  <PhoneCall
                    className={cn(
                      "h-10 w-10",
                      sp.status === "in_call" ? "text-green-600" : "text-amber-600"
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {STATUS_LABEL[sp.status] ?? ""}
                  </p>
                  <p className="text-2xl font-semibold font-mono">
                    {selectedClient?.name ?? phoneNumber ?? "—"}
                  </p>
                  {sp.status === "in_call" && (
                    <p className="text-xl font-mono mt-2 tabular-nums">
                      {fmtDuration(sp.callDurationSec)}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant={sp.isMuted ? "default" : "outline"}
                    onClick={sp.toggleMute}
                  >
                    {sp.isMuted ? (
                      <MicOff className="h-4 w-4 mr-2" />
                    ) : (
                      <Mic className="h-4 w-4 mr-2" />
                    )}
                    {sp.isMuted ? "Réactiver" : "Muet"}
                  </Button>
                  <Button variant="destructive" onClick={sp.hangup}>
                    <PhoneOff className="h-4 w-4 mr-2" /> Raccrocher
                  </Button>
                </div>
                {sp.error && (
                  <p className="text-sm text-red-600">{sp.error}</p>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4 text-muted-foreground">
                <Phone className="h-14 w-14 mx-auto opacity-30" />
                <p>Composez un numéro ou sélectionnez un client.</p>
                {/* Activation du micro (indispensable pour appeler) */}
                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant={micState === "granted" ? "outline" : "default"}
                    size="sm"
                    onClick={requestMic}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    {micState === "granted" ? "Micro autorisé ✅" : "Activer le micro"}
                  </Button>
                  <p className="text-xs">
                    À faire une fois avant le premier appel.
                  </p>
                </div>
                {sp.error && <p className="text-sm text-red-600">{sp.error}</p>}
              </div>
            )}
          </CardContent>
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
                  <p className="text-sm text-muted-foreground">
                    Aucun client associé.
                    <br />
                    Numéro : <span className="font-mono">{phoneNumber || "—"}</span>
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowClientSearch((v) => !v)}
                    >
                      <User className="h-4 w-4 mr-2" /> Associer à un client
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSearchByNumber}
                      disabled={!phoneNumber.trim()}
                    >
                      <Search className="h-4 w-4 mr-2" /> Rechercher ce numéro
                    </Button>
                    {/* Actions disponibles même sans client identifié */}
                    <Button
                      variant="outline"
                      onClick={handleCreateTask}
                      disabled={creatingTask}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" /> Créer une tâche de suivi
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigateToAdmin("clients?create=1")}
                    >
                      <UserPlus className="h-4 w-4 mr-2" /> Créer une fiche client
                    </Button>
                    <Button
                      variant="outline"
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-lg truncate">
                        {selectedClient.name}
                      </p>
                      {selectedClient.company_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          {selectedClient.company_name}
                        </p>
                      )}
                      {selectedClient.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {selectedClient.email}
                        </p>
                      )}
                      {selectedClient.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate font-mono">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          {selectedClient.phone}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setSelectedClient(null)}
                      title="Désassocier"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigateToAdmin("clients/" + selectedClient.id)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir la fiche
                    </Button>
                  </div>

                  <Separator />

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
                        onClick={() => navigateToAdmin("support")}
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
