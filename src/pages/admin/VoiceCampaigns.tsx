import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, ChevronDown, ChevronRight, Loader2, Mail, Phone, RefreshCw } from "lucide-react";
import { formatDateToFrench } from "@/utils/formatters";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  objective: string | null;
  language: string;
  status: "running" | "completed" | "canceled";
  total_calls: number;
  completed_calls: number;
  report_email: string | null;
  report_sent_at: string | null;
  created_at: string;
}

interface CallRow {
  id: string;
  client_id: string | null;
  status: string;
  duration_seconds: number | null;
  summary: string | null;
  to_phone: string | null;
  created_at: string;
}

const CALL_STATUS: Record<string, { label: string; cls: string }> = {
  queued: { label: "En file", cls: "bg-slate-100 text-slate-600" },
  ringing: { label: "Appel en cours…", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "En conversation", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Client joint", cls: "bg-green-100 text-green-700" },
  voicemail: { label: "Message laissé", cls: "bg-amber-100 text-amber-700" },
  no_answer: { label: "Pas de réponse", cls: "bg-orange-100 text-orange-700" },
  busy: { label: "Occupé", cls: "bg-orange-100 text-orange-700" },
  failed: { label: "Échec", cls: "bg-red-100 text-red-700" },
  canceled: { label: "Annulé", cls: "bg-slate-100 text-slate-500" },
  transferred_to_human: { label: "Transféré", cls: "bg-violet-100 text-violet-700" },
};

const TERMINAL = ["completed", "failed", "no_answer", "busy", "canceled", "transferred_to_human", "voicemail"];

const fmtDur = (s: number | null) => (s ? `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}` : "—");

const VoiceCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [calls, setCalls] = useState<Record<string, CallRow[]>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [loadingCalls, setLoadingCalls] = useState(false);

  const loadCampaigns = useCallback(async () => {
    const { data } = await supabase
      .from("voice_campaigns")
      .select("id, name, objective, language, status, total_calls, completed_calls, report_email, report_sent_at, created_at")
      .order("created_at", { ascending: false });
    setCampaigns((data as Campaign[]) ?? []);
    setLoading(false);
  }, []);

  const loadCalls = useCallback(async (campaignId: string) => {
    setLoadingCalls(true);
    const { data } = await supabase
      .from("voice_calls")
      .select("id, client_id, status, duration_seconds, summary, to_phone, created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    const rows = (data as CallRow[]) ?? [];
    setCalls((prev) => ({ ...prev, [campaignId]: rows }));

    const ids = [...new Set(rows.map((r) => r.client_id).filter(Boolean))] as string[];
    const missing = ids.filter((id) => !names[id]);
    if (missing.length) {
      const { data: cl } = await supabase.from("clients").select("id, name, first_name, last_name").in("id", missing);
      const map: Record<string, string> = {};
      (cl ?? []).forEach((c: any) => {
        map[c.id] = c.name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.id;
      });
      setNames((prev) => ({ ...prev, ...map }));
    }
    setLoadingCalls(false);
  }, [names]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  // Realtime : statut campagne + appels (rafraîchit la campagne ouverte).
  useEffect(() => {
    const ch = supabase
      .channel("voice_campaigns_page")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_campaigns" }, () => loadCampaigns())
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_calls" }, () => {
        if (expanded) loadCalls(expanded);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [expanded, loadCampaigns, loadCalls]);

  const toggle = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!calls[id]) loadCalls(id);
  };

  const progressOf = (c: Campaign) => {
    const rows = calls[c.id];
    if (!rows) return c.status === "completed" ? `${c.completed_calls}/${c.total_calls}` : `${c.total_calls} appel(s)`;
    const done = rows.filter((r) => TERMINAL.includes(r.status)).length;
    return `${done}/${rows.length}`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-violet-600" />
            Campagnes d'appels
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Appels groupés passés par Alex (agent IA), un par un. Un rapport est envoyé par email à la fin de chaque campagne.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadCampaigns}>
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
      ) : campaigns.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucune campagne. Dans la liste des Demandes, cochez les demandes en attente de documents puis « Appeler en groupe avec Alex ».
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                onClick={() => toggle(c.id)}
              >
                {expanded === c.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateToFrench(new Date(c.created_at))} · {c.language.toUpperCase()}
                    {c.objective ? ` · ${c.objective}` : ""}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">{progressOf(c)}</span>
                <Badge className={cn(
                  c.status === "running" ? "bg-blue-100 text-blue-700"
                    : c.status === "completed" ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500",
                )}>
                  {c.status === "running" ? "En cours" : c.status === "completed" ? "Terminée" : "Annulée"}
                </Badge>
              </button>

              {expanded === c.id && (
                <div className="border-t bg-slate-50/60">
                  {c.report_sent_at && (
                    <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-1.5 border-b">
                      <Mail className="w-3.5 h-3.5" /> Rapport envoyé{c.report_email ? ` à ${c.report_email}` : ""} le {formatDateToFrench(new Date(c.report_sent_at))}
                    </div>
                  )}
                  {loadingCalls && !calls[c.id] ? (
                    <div className="px-4 py-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement des appels…</div>
                  ) : (
                    <div className="divide-y">
                      {(calls[c.id] ?? []).map((call) => {
                        const st = CALL_STATUS[call.status] ?? { label: call.status, cls: "bg-slate-100 text-slate-600" };
                        return (
                          <div key={call.id} className="px-4 py-2.5 flex items-start gap-3">
                            <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{call.client_id ? (names[call.client_id] ?? call.to_phone) : call.to_phone}</div>
                              {call.summary && <div className="text-xs text-slate-600 mt-0.5">{call.summary}</div>}
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0">{fmtDur(call.duration_seconds)}</span>
                            <Badge className={cn("shrink-0", st.cls)}>{st.label}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VoiceCampaigns;
