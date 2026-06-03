// Detect & link legal-entity transfers (natural person → company, or any change
// of legal entity for the same person). Signal: the same person (matched by email
// or normalised name) holds contracts under DIFFERENT entities, and/or a contract
// has an abnormally SHORT duration because one took over mid-term from the other
// (e.g. Kevin Jadin → KJ Consult). We surface candidate pairs to link, plus any
// short contract for which no Leazr predecessor was found.

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Link2, RefreshCw, GitMerge, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CRow {
  id: string;
  contract_number: string | null;
  client_name: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  monthly_payment: number | null;
  previous_contract_id: string | null;
  clients?: { name?: string | null; email?: string | null; company?: string | null } | { name?: string | null; email?: string | null; company?: string | null }[] | null;
}
interface Pair {
  earlier: CRow;
  later: CRow;
  personLabel: string;
  laterMonths: number | null;
  diffEntity: boolean;
}

const SHORT_MONTHS = 30; // a Grenke lease is normally 36 months
const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const normPerson = (name?: string | null) =>
  stripAccents((name ?? "").toLowerCase()).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
const normCompany = (c?: string | null) => stripAccents((c ?? "").toLowerCase()).replace(/\b(srl|sprl|sa|nv|bv|asbl|comm\.?v|scs|sc)\b/g, "").replace(/[^a-z0-9]/g, "").trim();
const getCl = (r: CRow) => (Array.isArray(r.clients) ? r.clients[0] : r.clients) ?? null;
const monthsBetween = (a?: string | null, b?: string | null): number | null => {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
};
const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" }) : "—");
const entityOf = (r: CRow) => getCl(r)?.company || r.client_name || "—";

export default function ContractTransferMatcher() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [unmatched, setUnmatched] = useState<CRow[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [linking, setLinking] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const analyze = async () => {
    setLoading(true); setPairs([]); setUnmatched([]); setDone(new Set());
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, contract_number, client_name, contract_start_date, contract_end_date, monthly_payment, previous_contract_id, clients(name, email, company)")
        .neq("status", "cancelled");
      if (error) throw error;
      const rows = (data ?? []) as unknown as CRow[];

      // Group by person identity: email if present, else normalised name.
      const groups = new Map<string, CRow[]>();
      for (const r of rows) {
        const cl = getCl(r);
        const email = (cl?.email ?? "").trim().toLowerCase();
        const key = email || normPerson(cl?.name || r.client_name);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }

      const found: Pair[] = [];
      const pairedLaterIds = new Set<string>();
      for (const [key, list] of groups) {
        if (list.length < 2) continue;
        const sorted = [...list].sort((a, b) =>
          new Date(a.contract_start_date || 0).getTime() - new Date(b.contract_start_date || 0).getTime());
        for (let i = 1; i < sorted.length; i++) {
          const later = sorted[i], earlier = sorted[i - 1];
          if (later.previous_contract_id) continue;
          const laterMonths = monthsBetween(later.contract_start_date, later.contract_end_date);
          const diffEntity = normCompany(getCl(later)?.company) !== normCompany(getCl(earlier)?.company);
          const isShort = laterMonths != null && laterMonths > 0 && laterMonths < SHORT_MONTHS;
          // A transfer if entities differ, or the successor is abnormally short.
          if (!diffEntity && !isShort) continue;
          found.push({ earlier, later, personLabel: getCl(later)?.name || later.client_name || key, laterMonths, diffEntity });
          pairedLaterIds.add(later.id);
        }
      }
      // Short contracts with no predecessor found in Leazr — surfaced so the user
      // knows why the duration is short and can act (the predecessor may live only
      // at Grenke).
      const lonely = rows.filter((r) => {
        if (r.previous_contract_id || pairedLaterIds.has(r.id)) return false;
        const m = monthsBetween(r.contract_start_date, r.contract_end_date);
        return m != null && m > 0 && m < SHORT_MONTHS;
      });

      found.sort((a, b) => (a.laterMonths ?? 99) - (b.laterMonths ?? 99));
      setPairs(found);
      setUnmatched(lonely);
      const def: Record<string, string> = {};
      found.forEach((p) => { def[p.later.id] = "Passage personne physique → société"; });
      setReasons(def);
      toast.success(`${found.length} paire(s) · ${lonely.length} contrat(s) courts sans prédécesseur`);
    } catch (e) {
      console.error("[TransferMatcher]", e);
      toast.error("Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => { setOpen(true); void analyze(); };

  const link = async (p: Pair) => {
    setLinking(p.later.id);
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ previous_contract_id: p.earlier.id, link_reason: reasons[p.later.id] || "Transfert d'entité juridique" })
        .eq("id", p.later.id);
      if (error) throw error;
      toast.success("Contrats liés ✅");
      setDone((prev) => new Set(prev).add(p.later.id));
    } catch (e) {
      console.error("[TransferMatcher] link", e); toast.error("Erreur lors du lien");
    } finally { setLinking(null); }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen} className="gap-1.5">
        <GitMerge className="h-3.5 w-3.5" /> Transferts d'entité
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transferts d'entité (personne physique → société)</DialogTitle>
            <DialogDescription>
              Même personne, entités différentes ou durée courte (reprise mi-parcours). Validez les liens ci-dessous.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground"><RefreshCw className="h-6 w-6 animate-spin" /></div>
          )}

          {!loading && pairs.length === 0 && unmatched.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">Aucun transfert ni contrat à durée courte détecté.</div>
          )}

          {!loading && (pairs.length > 0 || unmatched.length > 0) && (
            <div className="space-y-4">
              {pairs.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Paires à lier ({pairs.length})</div>
                  {pairs.map((p) => {
                    const isDone = done.has(p.later.id);
                    return (
                      <div key={p.later.id} className={`rounded-lg border p-3 space-y-2 ${isDone ? "opacity-50" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{p.personLabel}</span>
                          <div className="flex items-center gap-1.5">
                            {p.diffEntity && <Badge variant="outline" className="text-blue-700 border-blue-300">entités ≠</Badge>}
                            {p.laterMonths != null && (
                              <Badge variant="outline" className={p.laterMonths < SHORT_MONTHS ? "text-amber-700 border-amber-300" : "text-muted-foreground"}>
                                {p.laterMonths} mois
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex-1 rounded-md border bg-muted/40 px-2 py-1.5">
                            <div className="font-medium">{p.earlier.contract_number ?? p.earlier.id.slice(0, 8)}</div>
                            <div className="text-muted-foreground">{entityOf(p.earlier)} · {fmtDate(p.earlier.contract_start_date)} → {fmtDate(p.earlier.contract_end_date)}</div>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1 rounded-md border bg-background px-2 py-1.5">
                            <div className="font-medium">{p.later.contract_number ?? p.later.id.slice(0, 8)}</div>
                            <div className="text-muted-foreground">{entityOf(p.later)} · {fmtDate(p.later.contract_start_date)} → {fmtDate(p.later.contract_end_date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={reasons[p.later.id] ?? ""}
                            onChange={(e) => setReasons((r) => ({ ...r, [p.later.id]: e.target.value }))}
                            className="h-8 flex-1 text-xs rounded-md border border-input bg-background px-2"
                          />
                          <Button size="sm" onClick={() => link(p)} disabled={linking === p.later.id || isDone} className="gap-1.5">
                            {linking === p.later.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                            {isDone ? "Lié" : "Lier"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {unmatched.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-amber-600" /> Durées courtes sans prédécesseur Leazr ({unmatched.length})</div>
                  <p className="text-xs text-muted-foreground">Le prédécesseur n'existe peut-être que chez Grenke. À lier manuellement dans le détail du contrat si vous l'identifiez.</p>
                  {unmatched.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-xs rounded-md border bg-background px-3 py-2">
                      <span className="font-medium truncate">{c.contract_number ?? c.id.slice(0, 8)} · {entityOf(c)}</span>
                      <span className="text-muted-foreground">{fmtDate(c.contract_start_date)} → {fmtDate(c.contract_end_date)} · {monthsBetween(c.contract_start_date, c.contract_end_date)} mois</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={analyze} disabled={loading} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Relancer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
