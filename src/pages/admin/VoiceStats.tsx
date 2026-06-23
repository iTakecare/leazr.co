import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Phone, UserCheck, Voicemail, FileCheck2, Clock, TrendingUp, MessagesSquare, Euro } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

interface CallRow {
  id: string;
  status: string;
  duration_seconds: number | null;
  created_at: string;
  offer_id: string | null;
  cost_eur: number | null;
}

const PERIODS = [
  { key: "30", label: "30 jours", days: 30 },
  { key: "90", label: "90 jours", days: 90 },
  { key: "all", label: "Tout", days: null },
] as const;

// Conversion attribuée à Alex : un document déposé dans les 14 jours après l'appel.
const ATTRIBUTION_DAYS = 14;

const OUTCOME = {
  joint: { label: "Humain joint", color: "#16a34a" },
  voicemail: { label: "Répondeur", color: "#f59e0b" },
  no_answer: { label: "Sans réponse", color: "#fb923c" },
  failed: { label: "Échec", color: "#ef4444" },
  pending: { label: "En cours", color: "#94a3b8" },
};

const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil((((t.getTime() - yStart.getTime()) / 86400000) + 1) / 7);
  return `S${wk}`;
};

const VoiceStats: React.FC = () => {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("90");
  // Coût réel = crédits ElevenLabs rapatriés (cost_eur) × prix du crédit de ton
  // plan. ElevenLabs n'expose pas d'€ par appel → tarif €/1000 crédits.
  // Défaut basé sur le plan iTakecare "Creator" : 22 $ / 300 000 crédits ≈
  // 0,068 €/1000 crédits. Modifiable et mémorisé localement.
  const [eurPer1k, setEurPer1k] = useState<number>(() => {
    const v = parseFloat(localStorage.getItem("alex_eur_per_1k_credits") ?? "");
    return Number.isFinite(v) && v > 0 ? v : 0.068;
  });
  useEffect(() => { localStorage.setItem("alex_eur_per_1k_credits", String(eurPer1k)); }, [eurPer1k]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("voice_calls")
        .select("id, status, duration_seconds, created_at, offer_id, cost_eur")
        .eq("provider", "elevenlabs")
        .order("created_at", { ascending: false });
      const rows = (data as CallRow[]) ?? [];
      setCalls(rows);

      // Conversion : dépôt de document après l'appel (≤14j), pour les appels liés à une demande.
      const offerIds = [...new Set(rows.map((r) => r.offer_id).filter(Boolean))] as string[];
      if (offerIds.length) {
        const { data: docs } = await supabase
          .from("offer_documents")
          .select("offer_id, created_at")
          .in("offer_id", offerIds);
        const byOffer = new Map<string, number[]>();
        (docs ?? []).forEach((d: any) => {
          if (!byOffer.has(d.offer_id)) byOffer.set(d.offer_id, []);
          byOffer.get(d.offer_id)!.push(new Date(d.created_at).getTime());
        });
        const conv = new Set<string>();
        rows.forEach((r) => {
          if (!r.offer_id) return;
          const t0 = new Date(r.created_at).getTime();
          const ups = byOffer.get(r.offer_id) ?? [];
          if (ups.some((u) => u > t0 && u <= t0 + ATTRIBUTION_DAYS * 86400000)) conv.add(r.id);
        });
        setConvertedIds(conv);
      } else {
        setConvertedIds(new Set());
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const p = PERIODS.find((x) => x.key === period)!;
    if (!p.days) return calls;
    const cutoff = Date.now() - p.days * 86400000;
    return calls.filter((c) => new Date(c.created_at).getTime() >= cutoff);
  }, [calls, period]);

  const outcomeOf = (s: string) => {
    if (s === "completed" || s === "transferred_to_human") return "joint";
    if (s === "voicemail") return "voicemail";
    if (s === "no_answer" || s === "busy" || s === "canceled") return "no_answer";
    if (s === "failed") return "failed";
    return "pending";
  };

  const k = useMemo(() => {
    const n = filtered.length;
    const by: Record<string, number> = { joint: 0, voicemail: 0, no_answer: 0, failed: 0, pending: 0 };
    let durSum = 0, durCount = 0, durAll = 0, credits = 0, withOffer = 0, converted = 0, real = 0;
    for (const c of filtered) {
      const o = outcomeOf(c.status);
      by[o]++;
      durAll += c.duration_seconds ?? 0; // tout le temps facturé (répondeurs inclus)
      credits += c.cost_eur ?? 0;        // crédits ElevenLabs réels (rapatriés)
      if (o === "joint" && c.duration_seconds) { durSum += c.duration_seconds; durCount++; }
      // Conversation réelle = humain joint ET au moins 30s d'échange (≠ a juste décroché).
      if (o === "joint" && (c.duration_seconds ?? 0) >= 30) real++;
      if (c.offer_id) { withOffer++; if (convertedIds.has(c.id)) converted++; }
    }
    return {
      n, by,
      avgDur: durCount ? Math.round(durSum / durCount) : 0,
      durAll, credits,
      joinRate: n ? Math.round((by.joint / n) * 100) : 0,
      vmRate: n ? Math.round((by.voicemail / n) * 100) : 0,
      real, realRate: n ? Math.round((real / n) * 100) : 0,
      withOffer, converted,
      convRate: withOffer ? Math.round((converted / withOffer) * 100) : 0,
    };
  }, [filtered, convertedIds]);

  const eur = useMemo(() => {
    const total = (k.credits / 1000) * eurPer1k; // crédits réels × prix du crédit
    return { total, perCall: k.n ? total / k.n : 0 };
  }, [k.credits, k.n, eurPer1k]);

  const pieData = useMemo(
    () => Object.entries(k.by).filter(([, v]) => v > 0).map(([key, v]) => ({ name: (OUTCOME as any)[key].label, value: v, color: (OUTCOME as any)[key].color })),
    [k],
  );

  const weekData = useMemo(() => {
    const m = new Map<string, { name: string; joint: number; voicemail: number; autre: number; t: number }>();
    for (const c of filtered) {
      const d = new Date(c.created_at);
      const key = isoWeek(d);
      if (!m.has(key)) m.set(key, { name: key, joint: 0, voicemail: 0, autre: 0, t: d.getTime() });
      const o = outcomeOf(c.status);
      const e = m.get(key)!;
      if (o === "joint") e.joint++; else if (o === "voicemail") e.voicemail++; else e.autre++;
    }
    return [...m.values()].sort((a, b) => a.t - b.t).slice(-10);
  }, [filtered]);

  const funnel = useMemo(() => [
    { name: "Appelés", value: k.n, color: "#6366f1" },
    { name: "Humain joint", value: k.by.joint, color: "#16a34a" },
    { name: "Conversations réelles", value: k.real, color: "#0d9488" },
    { name: "Docs déposés", value: k.converted, color: "#0ea5e9" },
  ], [k]);

  if (loading) {
    return <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement des statistiques…</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-violet-600" /> Statistiques Alex</h1>
          <p className="text-sm text-muted-foreground mt-1">Efficacité des appels de l'agent IA : jointures, répondeurs, et conversion en dépôt de documents.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Prix de 1000 crédits ElevenLabs selon votre abonnement">
            Tarif
            <input
              type="number" step="0.01" min="0" value={eurPer1k}
              onChange={(e) => setEurPer1k(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-16 rounded-md border px-1.5 py-1 text-xs text-foreground tabular-nums"
            />
            €/1000 créd.
          </label>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={cn("px-3 py-1 text-xs rounded-md transition-colors", period === p.key ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground")}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {k.n === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun appel Alex sur la période.</CardContent></Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={Phone} label="Appels" value={k.n} />
            <Kpi icon={UserCheck} label="Humain joint" value={`${k.joinRate}%`} sub={`${k.by.joint} appels`} tone="green" />
            <Kpi icon={MessagesSquare} label="Conversations réelles" value={`${k.realRate}%`} sub={`${k.real} ≥ 30s`} tone="green" />
            <Kpi icon={Voicemail} label="Répondeur" value={`${k.vmRate}%`} sub={`${k.by.voicemail} appels`} tone="amber" />
            <Kpi icon={FileCheck2} label="Conversion docs" value={`${k.convRate}%`} sub={`${k.converted}/${k.withOffer} liés`} tone="blue" />
            <Kpi icon={Clock} label="Durée moy. (joint)" value={`${Math.floor(k.avgDur / 60)}m${String(k.avgDur % 60).padStart(2, "0")}`} />
            <Kpi icon={Euro} label="Coût total" value={`${eur.total.toFixed(2)} €`} sub={`${Math.round(k.credits).toLocaleString("fr-FR")} crédits`} tone="blue" />
            <Kpi icon={Euro} label="Coût / appel" value={`${eur.perCall.toFixed(2)} €`} sub={`${k.n ? Math.round(k.credits / k.n) : 0} crédits/appel`} tone="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Donut résultats */}
            <Card><CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Répartition des résultats</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                {pieData.map((e) => (
                  <span key={e.name} className="text-xs flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />{e.name} ({e.value})</span>
                ))}
              </div>
            </CardContent></Card>

            {/* Entonnoir d'efficacité */}
            <Card><CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Entonnoir d'efficacité</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={funnel} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                  <RTooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {funnel.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-1">Conversion = document déposé dans les {ATTRIBUTION_DAYS} j suivant un appel lié à une demande.</p>
            </CardContent></Card>
          </div>

          {/* Volume hebdo */}
          <Card><CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">Volume d'appels par semaine</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <RTooltip />
                <Bar dataKey="joint" stackId="a" fill="#16a34a" name="Humain joint" />
                <Bar dataKey="voicemail" stackId="a" fill="#f59e0b" name="Répondeur" />
                <Bar dataKey="autre" stackId="a" fill="#cbd5e1" name="Autre" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </>
      )}
    </div>
  );
};

const Kpi: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; sub?: string; tone?: "green" | "amber" | "blue" }> = ({ icon: Icon, label, value, sub, tone }) => (
  <Card><CardContent className="p-3">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className={cn("w-3.5 h-3.5", tone === "green" && "text-green-600", tone === "amber" && "text-amber-600", tone === "blue" && "text-sky-600")} />{label}</div>
    <div className="text-xl font-bold mt-1">{value}</div>
    {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
  </CardContent></Card>
);

export default VoiceStats;
