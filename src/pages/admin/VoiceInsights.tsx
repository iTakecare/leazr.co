import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lightbulb, FileWarning, PhoneOff, ShieldAlert, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell } from "recharts";

// Libellés documents (alignés sur document-request / voice-campaign-start).
const DOC_LABELS: Record<string, string> = {
  balance_sheet: "Bilan financier", provisional_balance: "Bilan financier provisoire",
  tax_notice: "Avertissement extrait de rôle", tax_return: "Liasse fiscale",
  id_card_front: "Carte d'identité (recto)", id_card_back: "Carte d'identité (verso)",
  id_card: "Carte d'identité", company_register: "Extrait de registre d'entreprise",
  vat_certificate: "Attestation TVA", bank_statement: "Relevé bancaire",
  proof_of_address: "Justificatif de domicile", company_statutes: "Statuts de l'entreprise",
  custom: "Autre document",
};
const docLabel = (code: string) => code.startsWith("custom:") ? code.slice(7) : (DOC_LABELS[code] ?? code);

const validPhone = (p?: string | null) => {
  if (!p) return false;
  let s = p.trim().replace(/[^\d+]/g, "");
  if (s.startsWith("0032")) s = "+32" + s.slice(4);
  else if (s.startsWith("00")) s = "+" + s.slice(2);
  else if (s.startsWith("0")) s = "+32" + s.slice(1);
  else if (!s.startsWith("+")) s = "+32" + s;
  return /^\+\d{8,15}$/.test(s);
};

const DAYPARTS = [
  { key: "matin", label: "Matin (8-12h)", from: 8, to: 12 },
  { key: "midi", label: "Midi (12-14h)", from: 12, to: 14 },
  { key: "aprem", label: "Après-midi (14-18h)", from: 14, to: 18 },
  { key: "soir", label: "Soir (18-21h)", from: 18, to: 21 },
];

const VoiceInsights: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reach, setReach] = useState({ pending: 0, reachable: 0, noPhone: 0, noConsent: 0 });
  const [topDocs, setTopDocs] = useState<{ name: string; value: number }[]>([]);
  const [dayparts, setDayparts] = useState<{ name: string; rate: number; n: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Demandes en attente de docs + joignabilité.
      const { data: reqs } = await supabase
        .from("document_requests")
        .select("offer_id, documents")
        .is("fulfilled_at", null);
      const pendingOfferIds = [...new Set((reqs ?? []).map((r: any) => r.offer_id).filter(Boolean))] as string[];

      const { data: offers } = pendingOfferIds.length
        ? await supabase.from("offers").select("id, client_id").in("id", pendingOfferIds)
        : { data: [] };
      const clientIds = [...new Set((offers ?? []).map((o: any) => o.client_id).filter(Boolean))] as string[];
      const { data: clients } = clientIds.length
        ? await supabase.from("clients").select("id, phone, voice_consent_given_at").in("id", clientIds)
        : { data: [] };
      const clientById = new Map<string, any>((clients ?? []).map((c: any) => [c.id, c]));
      const offerById = new Map<string, any>((offers ?? []).map((o: any) => [o.id, o]));

      let reachable = 0, noPhone = 0, noConsent = 0;
      for (const oid of pendingOfferIds) {
        const o = offerById.get(oid);
        const c = o?.client_id ? clientById.get(o.client_id) : null;
        const hasPhone = validPhone(c?.phone);
        const hasConsent = !!c?.voice_consent_given_at;
        if (!hasPhone) noPhone++;
        else if (!hasConsent) noConsent++;
        else reachable++;
      }
      setReach({ pending: pendingOfferIds.length, reachable, noPhone, noConsent });

      // 2) Documents qui bloquent le plus (codes des demandes en attente).
      const tally: Record<string, number> = {};
      (reqs ?? []).forEach((r: any) => (r.documents ?? []).forEach((code: string) => { tally[code] = (tally[code] ?? 0) + 1; }));
      setTopDocs(Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([code, v]) => ({ name: docLabel(code), value: v })));

      // 3) Meilleur créneau d'appel (taux d'humain joint par tranche horaire).
      const { data: calls } = await supabase
        .from("voice_calls")
        .select("status, created_at")
        .eq("provider", "elevenlabs");
      const dp = DAYPARTS.map((d) => {
        const inBucket = (calls ?? []).filter((c: any) => { const h = new Date(c.created_at).getHours(); return h >= d.from && h < d.to; });
        const joint = inBucket.filter((c: any) => c.status === "completed" || c.status === "transferred_to_human").length;
        return { name: d.label, rate: inBucket.length ? Math.round((joint / inBucket.length) * 100) : 0, n: inBucket.length };
      });
      setDayparts(dp);

      setLoading(false);
    })();
  }, []);

  const recos = useMemo(() => {
    const r: { icon: React.ElementType; tone: string; text: string }[] = [];
    if (reach.noConsent > 0) r.push({ icon: ShieldAlert, tone: "text-amber-600", text: `${reach.noConsent} demande(s) en attente ont un client sans consentement aux appels IA → ajoutez le consentement sur leur fiche pour qu'Alex puisse les relancer.` });
    if (reach.noPhone > 0) r.push({ icon: PhoneOff, tone: "text-red-600", text: `${reach.noPhone} demande(s) en attente n'ont pas de numéro de téléphone valide → complétez la fiche client (ni appel ni SMS possible sinon).` });
    if (topDocs[0]) r.push({ icon: FileWarning, tone: "text-sky-600", text: `Le document qui bloque le plus est « ${topDocs[0].name} » (${topDocs[0].value} demandes) → expliquez-le mieux ou pré-collectez-le dès la création de la demande.` });
    const best = [...dayparts].filter((d) => d.n >= 2).sort((a, b) => b.rate - a.rate)[0];
    if (best) r.push({ icon: CheckCircle2, tone: "text-green-600", text: `Vos appels aboutissent le mieux sur « ${best.name} » (${best.rate}% d'humains joints) → privilégiez ce créneau pour les campagnes Alex.` });
    if (reach.reachable > 0) r.push({ icon: CheckCircle2, tone: "text-green-600", text: `${reach.reachable} demande(s) sont prêtes à être relancées par Alex maintenant (numéro + consentement OK) → lancez une campagne depuis l'onglet Demandes.` });
    return r;
  }, [reach, topDocs, dayparts]);

  if (loading) {
    return <div className="px-6 pb-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Analyse des pistes…</div>;
  }

  return (
    <div className="px-6 pb-8 max-w-5xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-500" /> Pistes d'amélioration</h2>
        <p className="text-sm text-muted-foreground">Ce que vos données suggèrent pour être plus efficaces avec les clients.</p>
      </div>

      {/* Joignabilité des demandes en attente */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Mini label="Demandes en attente de docs" value={reach.pending} />
        <Mini label="Prêtes pour Alex" value={reach.reachable} tone="green" />
        <Mini label="Bloquées : sans n°" value={reach.noPhone} tone="red" />
        <Mini label="Bloquées : sans consentement IA" value={reach.noConsent} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Documents qui bloquent */}
        <Card><CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Documents qui bloquent le plus</h3>
          {topDocs.length === 0 ? <p className="text-xs text-muted-foreground py-8 text-center">Aucune demande en attente.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topDocs} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis type="category" dataKey="name" width={140} fontSize={10} />
                <RTooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent></Card>

        {/* Meilleur créneau */}
        <Card><CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Taux d'humains joints par créneau</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dayparts}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={9} interval={0} />
              <YAxis allowDecimals={false} fontSize={11} unit="%" />
              <RTooltip formatter={(v: any, _n, p: any) => [`${v}% (${p.payload.n} appels)`, "Joints"]} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {dayparts.map((d, i) => <Cell key={i} fill={d.n >= 2 ? "#16a34a" : "#cbd5e1"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-1">Gris = trop peu d'appels pour conclure.</p>
        </CardContent></Card>
      </div>

      {/* Recommandations */}
      {recos.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Recommandations</h3>
          <ul className="space-y-2.5">
            {recos.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <r.icon className={`w-4 h-4 mt-0.5 shrink-0 ${r.tone}`} />
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
};

const Mini: React.FC<{ label: string; value: number; tone?: "green" | "red" | "amber" }> = ({ label, value, tone }) => (
  <Card><CardContent className="p-3">
    <div className={`text-2xl font-bold ${tone === "green" ? "text-green-600" : tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : ""}`}>{value}</div>
    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</div>
  </CardContent></Card>
);

export default VoiceInsights;
