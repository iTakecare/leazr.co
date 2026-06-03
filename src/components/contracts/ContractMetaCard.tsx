// Contract succession link + issue reason.
// - Succession: link this contract to the one it "takes over from" (predecessor),
//   e.g. a deal moving from a natural person to a company (Kevin Jadin → KJ
//   Consult). The predecessor can belong to a DIFFERENT client, so we link by
//   contract number rather than client. Explains the short duration.
// - Motif: why a contract is in trouble (Grenke's API never gives this), captured
//   manually: Faillite / Résiliation / Défaut de paiement / Litige / Autre + note.

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link2, Link2Off, AlertTriangle, Save, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContractMetaCardProps {
  contractId: string;
  companyId?: string;
  previousContractId?: string | null;
  linkReason?: string | null;
  issueType?: string | null;
  issueNote?: string | null;
  onUpdate?: () => void;
}

const ISSUE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "— Aucun —" },
  { value: "faillite", label: "Faillite" },
  { value: "resiliation", label: "Résiliation" },
  { value: "defaut_paiement", label: "Défaut de paiement" },
  { value: "litige", label: "Litige" },
  { value: "autre", label: "Autre" },
];

type MiniContract = { id: string; contract_number: string | null; client_name: string | null };

const ContractMetaCard: React.FC<ContractMetaCardProps> = ({
  contractId, companyId, previousContractId, linkReason, issueType, issueNote, onUpdate,
}) => {
  const [predecessor, setPredecessor] = useState<MiniContract | null>(null);
  const [successor, setSuccessor] = useState<MiniContract | null>(null);
  const [prevNumberInput, setPrevNumberInput] = useState("");
  const [reason, setReason] = useState(linkReason ?? "");
  const [issType, setIssType] = useState(issueType ?? "");
  const [issNote, setIssNote] = useState(issueNote ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setReason(linkReason ?? ""); setIssType(issueType ?? ""); setIssNote(issueNote ?? ""); }, [linkReason, issueType, issueNote]);

  // Load the linked predecessor (if any) + any successor (reverse link).
  useEffect(() => {
    (async () => {
      if (previousContractId) {
        const { data } = await supabase.from("contracts").select("id, contract_number, client_name").eq("id", previousContractId).maybeSingle();
        setPredecessor((data as MiniContract) ?? null);
      } else setPredecessor(null);
      const { data: succ } = await supabase.from("contracts").select("id, contract_number, client_name").eq("previous_contract_id", contractId).maybeSingle();
      setSuccessor((succ as MiniContract) ?? null);
    })();
  }, [contractId, previousContractId]);

  const linkPredecessor = async () => {
    const num = prevNumberInput.trim();
    if (!num) { toast.error("Indiquez le n° du contrat précédent."); return; }
    setBusy(true);
    try {
      let q = supabase.from("contracts").select("id, contract_number, client_name").eq("contract_number", num);
      if (companyId) q = q.eq("company_id", companyId);
      const { data: found } = await q.maybeSingle();
      if (!found) { toast.error(`Contrat ${num} introuvable.`); return; }
      if ((found as MiniContract).id === contractId) { toast.error("Un contrat ne peut pas se lier à lui-même."); return; }
      const { error } = await supabase.from("contracts").update({ previous_contract_id: (found as MiniContract).id, link_reason: reason || null }).eq("id", contractId);
      if (error) throw error;
      toast.success("Contrat précédent lié ✅");
      setPrevNumberInput("");
      onUpdate?.();
    } catch (e) {
      console.error(e); toast.error("Erreur lors du lien");
    } finally { setBusy(false); }
  };

  const unlinkPredecessor = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("contracts").update({ previous_contract_id: null }).eq("id", contractId);
      if (error) throw error;
      toast.success("Lien retiré");
      onUpdate?.();
    } catch (e) { console.error(e); toast.error("Erreur"); } finally { setBusy(false); }
  };

  const saveReasonAndIssue = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("contracts").update({ link_reason: reason || null, issue_type: issType || null, issue_note: issNote || null }).eq("id", contractId);
      if (error) throw error;
      toast.success("Enregistré ✅");
      onUpdate?.();
    } catch (e) { console.error(e); toast.error("Erreur lors de l'enregistrement"); } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Continuité & motif
        </CardTitle>
        <CardDescription>
          Lien de reprise entre contrats (ex. personne physique → société) et motif d'un contrat en difficulté.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Succession */}
        <div className="space-y-2">
          <Label>Continuité du contrat</Label>
          {predecessor ? (
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5">
                Prend la suite de <strong>{predecessor.contract_number ?? predecessor.id.slice(0, 8)}</strong>
                <span className="text-muted-foreground">({predecessor.client_name})</span>
              </span>
              <Button size="sm" variant="ghost" onClick={unlinkPredecessor} disabled={busy} className="gap-1 text-muted-foreground">
                <Link2Off className="h-3.5 w-3.5" /> Délier
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={prevNumberInput}
                onChange={(e) => setPrevNumberInput(e.target.value)}
                placeholder="N° du contrat précédent (ex. 180-9324)"
                className="h-9 flex-1 text-sm rounded-md border border-input bg-background px-2"
              />
              <Button size="sm" variant="outline" onClick={linkPredecessor} disabled={busy} className="gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Lier
              </Button>
            </div>
          )}
          {successor && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowRight className="h-3.5 w-3.5" /> Repris par <strong>{successor.contract_number ?? successor.id.slice(0, 8)}</strong> ({successor.client_name})
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Raison du lien</Label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex. Passage personne physique → société"
              className="mt-1 h-9 w-full text-sm rounded-md border border-input bg-background px-2"
            />
          </div>
        </div>

        <div className="border-t" />

        {/* Motif */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-600" /> Motif (contrat en difficulté)</Label>
          <select
            value={issType}
            onChange={(e) => setIssType(e.target.value)}
            className="h-9 w-full text-sm rounded-md border border-input bg-background px-2"
          >
            {ISSUE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <textarea
            value={issNote}
            onChange={(e) => setIssNote(e.target.value)}
            placeholder="Note (détail du motif)…"
            rows={2}
            className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5"
          />
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={saveReasonAndIssue} disabled={busy} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractMetaCard;
