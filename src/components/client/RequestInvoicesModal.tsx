import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Loader2, FileText, CheckCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { clientColors, primaryBtnStyle, ghostBtnStyle } from "@/components/client/clientUi";

interface Props {
  open: boolean;
  onClose: () => void;
  contract: any;
  client?: any;
}

const QUARTERS = [1, 2, 3, 4];

const formatPeriods = (sel: Record<number, number[]>, years: number[]): string =>
  years
    .map((y) => ({ year: y, qs: (sel[y] || []).slice().sort() }))
    .filter((p) => p.qs.length > 0)
    .map((p) => (p.qs.length === 4 ? `${p.year} — toute l'année` : `${p.year} — ${p.qs.map((q) => "T" + q).join(", ")}`))
    .join("\n");

const RequestInvoicesModal: React.FC<Props> = ({ open, onClose, contract, client }) => {
  const [sel, setSel] = useState<Record<number, number[]>>({});
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bodyDirty, setBodyDirty] = useState(false);
  const [sending, setSending] = useState(false);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const start = contract?.contract_start_date ? new Date(contract.contract_start_date).getFullYear() : now - 2;
    const from = Math.min(start, now - 2);
    const list: number[] = [];
    for (let y = now; y >= from; y--) list.push(y);
    return list;
  }, [contract]);

  const company = client?.company || client?.name || contract?.client_name || "";
  const contact = client?.contact_name || [client?.first_name, client?.last_name].filter(Boolean).join(" ") || "";

  const buildSubject = useCallback(
    () => `Demande de factures — Contrat ${contract?.contract_number || ""}${company ? ` (${company})` : ""}`.trim(),
    [contract, company]
  );

  const buildBody = useCallback(
    (periodsText: string) => {
      const lines = [
        "Madame, Monsieur,",
        "",
        `Au nom de ${company}${contact ? ` (${contact})` : ""}, nous souhaitons recevoir les factures relatives au contrat de leasing suivant :`,
        "",
        `• Numéro de contrat : ${contract?.contract_number || "—"}`,
        `• Bailleur : ${contract?.leaser_name || "—"}`,
        `• Société : ${company}`,
        client?.vat_number ? `• N° TVA : ${client.vat_number}` : "",
        client?.phone ? `• Téléphone : ${client.phone}` : "",
        client?.email ? `• Email : ${client.email}` : "",
        "",
        "Périodes demandées :",
        periodsText || "(à préciser)",
        "",
        "Pour les factures émises à partir du 1er janvier 2026, merci de bien vouloir les transmettre via le réseau Peppol (facturation électronique).",
        "",
        "Vous en remerciant par avance,",
        contact || company,
      ].filter((l) => l !== "");
      return lines.join("\n");
    },
    [company, contact, contract, client]
  );

  // Auto-régénère le mail tant que l'utilisateur ne l'a pas édité manuellement.
  useEffect(() => {
    if (!open) return;
    if (!bodyDirty) setBody(buildBody(formatPeriods(sel, years)));
  }, [sel, years, open, bodyDirty, buildBody]);

  useEffect(() => {
    if (open && !subject) setSubject(buildSubject());
  }, [open, subject, buildSubject]);

  const reset = () => {
    setBodyDirty(false);
    setBody(buildBody(formatPeriods(sel, years)));
    setSubject(buildSubject());
  };

  const toggleQuarter = (year: number, q: number) =>
    setSel((s) => {
      const cur = new Set(s[year] || []);
      cur.has(q) ? cur.delete(q) : cur.add(q);
      return { ...s, [year]: [...cur].sort() };
    });
  const toggleYear = (year: number) =>
    setSel((s) => ({ ...s, [year]: (s[year] || []).length === 4 ? [] : [...QUARTERS] }));
  const selectAll = () => setSel(Object.fromEntries(years.map((y) => [y, [...QUARTERS]])));
  const clearAll = () => setSel({});

  const totalSelected = Object.values(sel).reduce((n, qs) => n + qs.length, 0);

  const send = async () => {
    const periods = years
      .map((y) => ({ year: y, quarters: sel[y] || [] }))
      .filter((p) => p.quarters.length > 0)
      .map((p) => (p.quarters.length === 4 ? { year: p.year, all: true } : p));
    if (periods.length === 0) { toast.error("Sélectionnez au moins un trimestre."); return; }
    if (!body.trim()) { toast.error("Le corps du message est vide."); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-invoices", {
        body: { contract_id: contract.id, periods, subject: subject.trim(), body },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.message || data.error);
      toast.success(`Demande envoyée à la comptabilité du bailleur${data?.cc ? " (copie à votre email)" : ""}.`);
      onClose();
      setSel({}); setBodyDirty(false);
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
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: clientColors.indigo }} />
            Demander des factures
          </DialogTitle>
        </DialogHeader>

        <div style={{ fontSize: 13, color: clientColors.muted, marginTop: -4 }}>
          Contrat <strong>{[contract?.leaser_name, contract?.contract_number].filter(Boolean).join(" · ")}</strong>. Cochez les périodes,
          relisez/modifiez le mail, puis envoyez-le à la comptabilité du bailleur en votre nom.
        </div>

        <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
          <button style={{ ...ghostBtnStyle, height: 32 }} onClick={selectAll}><CheckCheck size={14} /> Toutes les factures</button>
          {totalSelected > 0 && <button style={{ ...ghostBtnStyle, height: 32 }} onClick={clearAll}>Tout décocher</button>}
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
                      <button key={q} onClick={() => toggleQuarter(year, q)} style={{ height: 38, borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${on ? clientColors.indigo : "#E2E5EC"}`, background: on ? clientColors.indigo : "#fff", color: on ? "#fff" : "#475569" }}>
                        T{q}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Éditeur du mail */}
        <div style={{ marginTop: 16, borderTop: `1px solid ${clientColors.borderSoft}`, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: clientColors.ink }}>Aperçu du mail (modifiable)</span>
            <button onClick={reset} style={{ ...ghostBtnStyle, height: 30 }} title="Régénérer le texte automatique">
              <RotateCcw size={13} /> Réinitialiser
            </button>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 6 }}>Objet</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ marginBottom: 12 }} />
          <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 6 }}>Message</label>
          <Textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setBodyDirty(true); }}
            rows={14}
            style={{ fontSize: 13.5, lineHeight: 1.55 }}
          />
          <div style={{ fontSize: 11.5, color: clientColors.faint, marginTop: 8 }}>
            ℹ️ Le mail part au nom de votre société, en copie à votre adresse, avec réponse vers vous. (Le destinataire = l'adresse comptabilité du bailleur, gérée par iTakecare.)
          </div>
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
