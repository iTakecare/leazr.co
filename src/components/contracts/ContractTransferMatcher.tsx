// Detect & link legal-entity transfers (natural person → company, or any change
// of legal entity for the same person). Signal: the same person (matched by email
// or normalised name) holds contracts under DIFFERENT entities (different company),
// which produces a "short duration" contract when one takes over mid-term from the
// other (e.g. Kevin Jadin → KJ Consult). We surface the pairs and let the user
// link them (sets previous_contract_id + link_reason on the successor).

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Link2, RefreshCw, GitMerge } from "lucide-react";
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
  clients?: { name?: string | null; email?: string | null; company?: string | null } | null;
}
interface Pair {
  earlier: CRow;
  later: CRow;
  personLabel: string;
  laterMonths: number | null;
}

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const normPerson = (name?: string | null) =>
  stripAccents((name ?? "").toLowerCase()).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
const normCompany = (c?: string | null) => stripAccents((c ?? "").toLowerCase()).replace(/\b(srl|sprl|sa|nv|bv|asbl|comm\.?v|scs|sc)\b/g, "").replace(/[^a-z0-9]/g, "").trim();

const monthsBetween = (a?: string | null, b?: string | null): number | null => {
  if (!a || !b) return null;
  const d1 = new Date(a), d2 = new Date(b);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
};
const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" }) : "—");

export default function ContractTransferMatcher() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [linking, setLinking] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const analyze = async () => {
    setLoading(true);
    setPairs([]);
    setDone(new Set());
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
        const email = (r.clients?.email ?? "").trim().toLowerCase();
        const personName = normPerson(r.clients?.name || r.client_name);
        const key = email || personName;
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }

      const found: Pair[] = [];
      for (const [key, list] of groups) {
        if (list.length < 2) continue;
        // Need at least two DISTINCT entities (company) in the group.
        const companies = new Set(list.map((r) => normCompany(r.clients?.company)));
        if (companies.size < 2) continue;
        // Chronological chain; pair each contract with the previous one of a
        // different entity (that's the takeover).
        const sorted = [...list].sort((a, b) =>
          new Date(a.contract_start_date || 0).getTime() - new Date(b.contract_start_date || 0).getTime());
        for (let i = 1; i < sorted.length; i++) {
          const later = sorted[i], earlier = sorted[i - 1];
          if (normCompany(later.clients?.company) === normCompany(earlier.clients?.company)) continue;
          if (later.previous_contract_id) continue; // already linked
          const personLabel = later.clients?.name || later.client_name || key;
          found.push({ earlier, later, personLabel, laterMonths: monthsBetween(later.contract_start_date, later.contract_end_date) });
        }
      }
      // Show the most suspicious first: shortest successor duration on top.
      found.sort((a, b) => (a.laterMonths ?? 99) - (b.laterMonths ?? 99));
      setPairs(found);
      const def: Record<string, string> = {};
      found.forEach((p) => { def[p.later.id] = "Passage personne physique → société"; });
      setReasons(def);
      toast.success(`${found.length} transfert(s) potentiel(s) détecté(s)`);
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
      console.error("[TransferMatcher] link", e);
      toast.error("Erreur lors du lien");
    } finally {
      setLinking(null);
    }
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
              Même personne, entités juridiques différentes — la reprise mi-parcours explique les durées courtes. Validez les liens ci-dessous.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && pairs.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">Aucun transfert détecté.</div>
          )}

          {!loading && pairs.length > 0 && (
            <div className="space-y-3">
              {pairs.map((p) => {
                const isDone = done.has(p.later.id);
                return (
                  <div key={p.later.id} className={`rounded-lg border p-3 space-y-2 ${isDone ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{p.personLabel}</span>
                      {p.laterMonths != null && (
                        <Badge variant="outline" className={p.laterMonths < 30 ? "text-amber-700 border-amber-300" : "text-muted-foreground"}>
                          durée reprise : {p.laterMonths} mois
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex-1 rounded-md border bg-muted/40 px-2 py-1.5">
                        <div className="font-medium">{p.earlier.contract_number ?? p.earlier.id.slice(0, 8)}</div>
                        <div className="text-muted-foreground">{p.earlier.clients?.company || p.earlier.client_name} · {fmtDate(p.earlier.contract_start_date)} → {fmtDate(p.earlier.contract_end_date)}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 rounded-md border bg-background px-2 py-1.5">
                        <div className="font-medium">{p.later.contract_number ?? p.later.id.slice(0, 8)}</div>
                        <div className="text-muted-foreground">{p.later.clients?.company || p.later.client_name} · {fmtDate(p.later.contract_start_date)} → {fmtDate(p.later.contract_end_date)}</div>
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
