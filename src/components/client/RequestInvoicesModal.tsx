import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, FileText, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { clientColors, primaryBtnStyle, ghostBtnStyle } from "@/components/client/clientUi";

interface Props {
  open: boolean;
  onClose: () => void;
  contract: any;
}

const QUARTERS = [1, 2, 3, 4];

const RequestInvoicesModal: React.FC<Props> = ({ open, onClose, contract }) => {
  const [sel, setSel] = useState<Record<number, number[]>>({});
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const start = contract?.contract_start_date ? new Date(contract.contract_start_date).getFullYear() : now - 2;
    const from = Math.min(start, now - 2);
    const list: number[] = [];
    for (let y = now; y >= from; y--) list.push(y);
    return list;
  }, [contract]);

  const toggleQuarter = (year: number, q: number) =>
    setSel((s) => {
      const cur = new Set(s[year] || []);
      cur.has(q) ? cur.delete(q) : cur.add(q);
      return { ...s, [year]: [...cur].sort() };
    });

  const toggleYear = (year: number) =>
    setSel((s) => {
      const full = (s[year] || []).length === 4;
      return { ...s, [year]: full ? [] : [...QUARTERS] };
    });

  const selectAll = () => setSel(Object.fromEntries(years.map((y) => [y, [...QUARTERS]])));
  const clearAll = () => setSel({});

  const totalSelected = Object.values(sel).reduce((n, qs) => n + qs.length, 0);

  const send = async () => {
    const periods = years
      .map((y) => ({ year: y, quarters: sel[y] || [] }))
      .filter((p) => p.quarters.length > 0)
      .map((p) => (p.quarters.length === 4 ? { year: p.year, all: true } : p));
    if (periods.length === 0) {
      toast.error("Sélectionnez au moins un trimestre.");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-invoices", {
        body: { contract_id: contract.id, periods, extra_message: message.trim() || undefined },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.message || data.error);
      toast.success(`Demande envoyée à la comptabilité du bailleur${data?.cc ? " (copie à votre email)" : ""}.`);
      onClose();
      setSel({});
      setMessage("");
    } catch (e: any) {
      const msg = (e?.message || "").includes("no_leaser_email")
        ? "Aucune adresse comptabilité n'est configurée pour ce bailleur. Contactez votre conseiller."
        : "Échec de l'envoi : " + (e?.message || "");
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: clientColors.indigo }} />
            Demander des factures
          </DialogTitle>
        </DialogHeader>

        <div style={{ fontSize: 13, color: clientColors.muted, marginTop: -4 }}>
          Contrat <strong>{[contract?.leaser_name, contract?.contract_number].filter(Boolean).join(" · ")}</strong>. Sélectionnez les périodes ;
          un email pré-rempli sera envoyé à la comptabilité du bailleur en votre nom.
        </div>

        <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
          <button style={{ ...ghostBtnStyle, height: 32 }} onClick={selectAll}>
            <CheckCheck size={14} /> Toutes les factures
          </button>
          {totalSelected > 0 && (
            <button style={{ ...ghostBtnStyle, height: 32 }} onClick={clearAll}>Tout décocher</button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {years.map((year) => {
            const qs = sel[year] || [];
            const full = qs.length === 4;
            return (
              <div key={year} style={{ border: `1px solid ${clientColors.border}`, borderRadius: 12, padding: "12px 14px", background: full ? "#F5F8FF" : "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: clientColors.ink }}>{year}</span>
                  <button onClick={() => toggleYear(year)} style={{ fontSize: 12, fontWeight: 600, color: clientColors.indigo, background: "transparent", border: 0, cursor: "pointer" }}>
                    {full ? "Désélectionner" : "Toute l'année"}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                  {QUARTERS.map((q) => {
                    const on = qs.includes(q);
                    return (
                      <button
                        key={q}
                        onClick={() => toggleQuarter(year, q)}
                        style={{
                          height: 38, borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600,
                          border: `1px solid ${on ? clientColors.indigo : "#E2E5EC"}`,
                          background: on ? clientColors.indigo : "#fff", color: on ? "#fff" : "#475569",
                        }}
                      >
                        T{q}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 6 }}>
            Message complémentaire (optionnel)
          </label>
          <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. merci d'envoyer en PDF + Peppol." />
        </div>

        <div style={{ fontSize: 11.5, color: clientColors.faint, marginTop: 8 }}>
          ℹ️ Les factures émises à partir du 1er janvier 2026 seront demandées via Peppol (facturation électronique).
        </div>

        <DialogFooter>
          <button style={ghostBtnStyle} onClick={onClose}>Annuler</button>
          <button style={primaryBtnStyle} onClick={send} disabled={sending || totalSelected === 0}>
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Envoyer la demande
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestInvoicesModal;
