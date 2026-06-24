import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bot, Loader2, Save, RefreshCw, Sparkles, Send, ClipboardCheck, MessageSquare,
  SlidersHorizontal, FileText, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------------
// Onglet « Configuration » du Centre d'appels : paramétrage de l'agent vocal
// Alex (prompt système + message d'ouverture + paramètres ElevenLabs), rapports
// du Coach Alex, et dialogue avec le coach pour refondre les prompts.
// ----------------------------------------------------------------------------

interface AgentConfig {
  name: string;
  system_prompt: string;
  first_message: string;
  language: string;
  llm: string;
  temperature: number | null;
  voice_id: string;
  tts_model_id: string;
  stability: number | null;
  speed: number | null;
  similarity_boost: number | null;
  tools: string[];
}

interface CoachReport {
  id: string;
  source: "cron" | "manual";
  window_days: number;
  calls_analyzed: number;
  stats: Record<string, number>;
  html: string;
  summary: string | null;
  created_at: string;
}

interface ChatMsg { role: "user" | "assistant"; content: string }

async function invoke<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("voice-config", { body: { action, ...body } });
  if (error) {
    // L'erreur edge renvoie souvent un JSON dans le contexte ; on remonte un message lisible.
    let detail = error.message;
    try { const ctx = (error as any).context; if (ctx?.detail) detail = JSON.stringify(ctx.detail); } catch { /* */ }
    throw new Error(detail || "Erreur edge");
  }
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

// Extrait les blocs ```prompt``` / ```first_message``` d'une réponse du coach.
function extractBlocks(text: string): { prompt?: string; firstMessage?: string } {
  const out: { prompt?: string; firstMessage?: string } = {};
  const p = text.match(/```prompt\s*\n([\s\S]*?)```/);
  if (p) out.prompt = p[1].trim();
  const f = text.match(/```first_message\s*\n([\s\S]*?)```/);
  if (f) out.firstMessage = f[1].trim();
  return out;
}

const num = (v: number | null) => (v === null || v === undefined ? "" : String(v));

const VoiceConfig: React.FC = () => {
  const [cfg, setCfg] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Charge la config de l'agent depuis ElevenLabs.
  const loadAgent = async () => {
    setLoading(true); setLoadError(null);
    try {
      const r = await invoke<{ config: AgentConfig }>("get_agent");
      setCfg(r.config);
    } catch (e: any) {
      setLoadError(e.message || "Chargement impossible");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadAgent(); }, []);

  const set = <K extends keyof AgentConfig>(k: K, v: AgentConfig[K]) =>
    setCfg((c) => (c ? { ...c, [k]: v } : c));

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        system_prompt: cfg.system_prompt,
        first_message: cfg.first_message,
        language: cfg.language,
      };
      if (cfg.llm) updates.llm = cfg.llm;
      if (cfg.temperature !== null) updates.temperature = cfg.temperature;
      if (cfg.voice_id) updates.voice_id = cfg.voice_id;
      if (cfg.tts_model_id) updates.tts_model_id = cfg.tts_model_id;
      if (cfg.stability !== null) updates.stability = cfg.stability;
      if (cfg.speed !== null) updates.speed = cfg.speed;
      if (cfg.similarity_boost !== null) updates.similarity_boost = cfg.similarity_boost;
      const r = await invoke<{ config: AgentConfig }>("update_agent", { updates });
      setCfg(r.config);
      toast.success("Configuration d'Alex enregistrée sur ElevenLabs.");
    } catch (e: any) {
      toast.error("Échec de l'enregistrement : " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const applyPrompt = (text: string) => {
    set("system_prompt", text);
    toast.message("Prompt appliqué au formulaire — pensez à enregistrer.");
    promptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const applyFirstMessage = (text: string) => {
    set("first_message", text);
    toast.message("Message d'ouverture appliqué — pensez à enregistrer.");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 space-y-5">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-sm shadow-violet-500/30">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold leading-tight">Configuration d'Alex</h2>
          <p className="text-sm text-muted-foreground">
            Prompt, voix et paramètres ElevenLabs — et dialogue avec le Coach Alex pour les affiner.
          </p>
        </div>
      </div>

      {/* ---- Prompt & ouverture ---- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" /> Prompt & message d'ouverture
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAgent} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} /> Recharger
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !cfg}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Enregistrer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la config ElevenLabs…
            </div>
          ) : loadError ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-200 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Impossible de charger la configuration de l'agent.</p>
                <p className="text-amber-700">{loadError}</p>
                <p className="text-amber-700 mt-1">Vérifiez les variables <code>ELEVENLABS_API_KEY</code> et <code>ELEVENLABS_AGENT_ID</code>.</p>
              </div>
            </div>
          ) : cfg ? (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{cfg.name}</Badge>
                {cfg.tools?.length > 0 && <span>Outils : {cfg.tools.join(", ")}</span>}
              </div>

              <div>
                <label className="text-sm font-medium">Prompt système</label>
                <Textarea
                  ref={promptRef}
                  value={cfg.system_prompt}
                  onChange={(e) => set("system_prompt", e.target.value)}
                  rows={14}
                  className="mt-1 font-mono text-xs leading-relaxed"
                  placeholder="Instructions complètes données à Alex…"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Message d'ouverture (par défaut)</label>
                <Textarea
                  value={cfg.first_message}
                  onChange={(e) => set("first_message", e.target.value)}
                  rows={3}
                  className="mt-1 text-sm"
                  placeholder="Première phrase d'Alex…"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Note : pour les appels sortants (campagnes, KYC), l'ouverture est personnalisée par appel
                  (prénom + documents manquants) et remplace ce message par défaut.
                </p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* ---- Paramètres ElevenLabs ---- */}
      {cfg && !loadError && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-violet-600" /> Paramètres voix & modèle
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Langue par défaut">
              <Input value={cfg.language} onChange={(e) => set("language", e.target.value)} placeholder="fr / nl / en" />
            </Field>
            <Field label="Voice ID (ElevenLabs)">
              <Input value={cfg.voice_id} onChange={(e) => set("voice_id", e.target.value)} placeholder="voice_id" />
            </Field>
            <Field label="Modèle TTS">
              <Input value={cfg.tts_model_id} onChange={(e) => set("tts_model_id", e.target.value)} placeholder="eleven_multilingual_v2" />
            </Field>
            <Field label="Modèle LLM">
              <Input value={cfg.llm} onChange={(e) => set("llm", e.target.value)} placeholder="ex. gemini-2.0-flash" />
            </Field>
            <Field label="Température LLM">
              <Input type="number" step="0.05" min="0" max="1" value={num(cfg.temperature)}
                onChange={(e) => set("temperature", e.target.value === "" ? null : parseFloat(e.target.value))} />
            </Field>
            <Field label="Stabilité voix (0–1)">
              <Input type="number" step="0.05" min="0" max="1" value={num(cfg.stability)}
                onChange={(e) => set("stability", e.target.value === "" ? null : parseFloat(e.target.value))} />
            </Field>
            <Field label="Vitesse (0.7–1.2)">
              <Input type="number" step="0.05" min="0.5" max="1.5" value={num(cfg.speed)}
                onChange={(e) => set("speed", e.target.value === "" ? null : parseFloat(e.target.value))} />
            </Field>
            <Field label="Similarité (0–1)">
              <Input type="number" step="0.05" min="0" max="1" value={num(cfg.similarity_boost)}
                onChange={(e) => set("similarity_boost", e.target.value === "" ? null : parseFloat(e.target.value))} />
            </Field>
          </CardContent>
        </Card>
      )}

      {/* ---- Coach Alex : rapports + dialogue ---- */}
      <CoachPanel onApplyPrompt={applyPrompt} onApplyFirstMessage={applyFirstMessage} />
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// Coach Alex : derniers rapports + dialogue interactif.
// ---------------------------------------------------------------------------
const CoachPanel: React.FC<{
  onApplyPrompt: (t: string) => void;
  onApplyFirstMessage: (t: string) => void;
}> = ({ onApplyPrompt, onApplyFirstMessage }) => {
  const [reports, setReports] = useState<CoachReport[]>([]);
  const [running, setRunning] = useState(false);
  const [openReport, setOpenReport] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const loadReports = async () => {
    try {
      const r = await invoke<{ reports: CoachReport[] }>("list_reports");
      setReports(r.reports || []);
      if (r.reports?.[0]) setOpenReport((o) => o ?? r.reports[0].id);
    } catch { /* silencieux */ }
  };
  useEffect(() => { loadReports(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await invoke<{ analyzed: number; reason?: string }>("run_coach");
      if (r.analyzed === 0) {
        toast.info(r.reason === "no_calls" ? "Aucun appel transcrit récent à analyser." : "Analyse indisponible pour le moment.");
      } else {
        toast.success(`Analyse terminée — ${r.analyzed} appel(s) analysé(s).`);
        await loadReports();
      }
    } catch (e: any) {
      toast.error("Échec de l'analyse : " + (e.message || ""));
    } finally {
      setRunning(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const r = await invoke<{ reply: string }>("coach_chat", { messages: next });
      setMessages([...next, { role: "assistant", content: r.reply }]);
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: "⚠️ Erreur : " + (e.message || "réessayez.") }]);
    } finally {
      setSending(false);
    }
  };

  const current = reports.find((r) => r.id === openReport) ?? reports[0];

  const starters = [
    "Quels sont les 3 ajustements prioritaires du prompt d'Alex ?",
    "Propose-moi un message d'ouverture plus court qui réduit les raccrochages.",
    "Réécris le prompt système complet en intégrant tes recommandations.",
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" /> Coach Alex
        </CardTitle>
        <Button size="sm" variant="outline" onClick={runNow} disabled={running}>
          {running ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Analyser maintenant
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Derniers rapports */}
        {reports.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {reports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setOpenReport(r.id)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full ring-1 transition-colors",
                    r.id === current?.id
                      ? "bg-violet-600 text-white ring-violet-600"
                      : "bg-muted text-muted-foreground ring-transparent hover:bg-accent",
                  )}
                >
                  {new Date(r.created_at).toLocaleDateString("fr-BE", { day: "2-digit", month: "short" })}
                  {" · "}{r.calls_analyzed} appels{r.source === "cron" ? " (hebdo)" : ""}
                </button>
              ))}
            </div>
            {current && (
              <div
                className="prose prose-sm max-w-none rounded-lg bg-muted/40 p-4 text-sm [&_h2]:text-base [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3"
                dangerouslySetInnerHTML={{ __html: current.html }}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun rapport pour l'instant. Le Coach Alex tourne automatiquement chaque semaine, ou lancez une
            analyse à la demande ci-dessus.
          </p>
        )}

        <Separator />

        {/* Dialogue avec le coach */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <MessageSquare className="h-4 w-4 text-violet-600" /> Dialoguer avec le coach
          </div>

          <div className="rounded-lg border bg-background max-h-[420px] overflow-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Demandez au coach de refondre le prompt d'Alex à partir des analyses. Il peut proposer un
                  prompt complet que vous appliquez en un clic.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {starters.map((s) => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <ChatBubble key={i} msg={m} onApplyPrompt={onApplyPrompt} onApplyFirstMessage={onApplyFirstMessage} />
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Le coach réfléchit…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex items-end gap-2 mt-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2}
              placeholder="Ex. « Réécris le prompt pour mieux gérer les répondeurs et raccourcir l'intro »"
              className="text-sm"
            />
            <Button onClick={send} disabled={sending || !input.trim()} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ChatBubble: React.FC<{
  msg: ChatMsg;
  onApplyPrompt: (t: string) => void;
  onApplyFirstMessage: (t: string) => void;
}> = ({ msg, onApplyPrompt, onApplyFirstMessage }) => {
  const blocks = useMemo(() => (msg.role === "assistant" ? extractBlocks(msg.content) : {}), [msg]);
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
        isUser ? "bg-violet-600 text-white" : "bg-muted text-foreground",
      )}>
        <span>{msg.content}</span>
        {(blocks.prompt || blocks.firstMessage) && (
          <div className="flex flex-wrap gap-2 mt-2.5">
            {blocks.prompt && (
              <Button size="sm" variant="secondary" onClick={() => onApplyPrompt(blocks.prompt!)}>
                <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Appliquer ce prompt
              </Button>
            )}
            {blocks.firstMessage && (
              <Button size="sm" variant="secondary" onClick={() => onApplyFirstMessage(blocks.firstMessage!)}>
                <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Appliquer l'ouverture
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceConfig;
