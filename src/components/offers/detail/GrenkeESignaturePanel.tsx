// Phase 4 — Grenke e-signature (DocuSign) panel. Shown inside the Grenke
// workflow panel when grenke_state === 'ReadyToSign'.
//
// Flow:
//   1. Fetch the e-signature config + document gate (get_esignature_config).
//   2. Show a document checklist — the 'Send' button is disabled while any
//      requested document is still pending/rejected.
//   3. Prefill a signer form from the client (editable).
//   4. 'Envoyer pour signature DocuSign' → start_esignature.

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, RefreshCw, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TITLES = ["Mr", "Ms", "Miss", "Mrs", "Dr", "Prof"];

interface GrenkeESignaturePanelProps {
  offerId: string;
  onSent?: () => void;
}

interface Signer {
  title: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
}

interface ConfigResponse {
  success: boolean;
  config: {
    MinNumberOfCustomerSignees?: number;
    MaxNumberOfCustomerSignees?: number;
    MinNumberOfPartnerSignees?: number;
    MaxNumberOfPartnerSignees?: number;
  } | null;
  documents_pending?: Array<{ document_type: string; status: string }>;
  can_send?: boolean;
  error?: string;
  message?: string;
}

const DOC_LABELS: Record<string, string> = {
  balance_sheet: "Bilan financier",
  tax_notice: "Avertissement extrait de rôle",
  id_card_front: "Carte d'identité (recto)",
  id_card_back: "Carte d'identité (verso)",
  id_card: "Carte d'identité",
  company_register: "Extrait de registre d'entreprise",
  vat_certificate: "Attestation TVA",
  bank_statement: "Relevé bancaire",
};

export default function GrenkeESignaturePanel({ offerId, onSent }: GrenkeESignaturePanelProps) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [signer, setSigner] = useState<Signer>({ title: "Mr", first_name: "", last_name: "", email: "", mobile: "" });
  const [partner, setPartner] = useState<Signer>({ title: "Mr", first_name: "", last_name: "", email: "", mobile: "" });

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId]);

  const init = async () => {
    setLoading(true);
    // Prefill customer signer from the offer's client.
    const { data: offer } = await supabase.from("offers").select("client_id").eq("id", offerId).maybeSingle();
    const clientId = (offer as { client_id?: string } | null)?.client_id;
    if (clientId) {
      const { data: client } = await supabase
        .from("clients")
        .select("first_name, last_name, name, email, phone")
        .eq("id", clientId)
        .maybeSingle();
      const c = client as { first_name?: string; last_name?: string; name?: string; email?: string; phone?: string } | null;
      if (c) {
        const fallbackFirst = c.first_name || (c.name?.split(" ")[0] ?? "");
        const fallbackLast = c.last_name || (c.name?.split(" ").slice(1).join(" ") ?? "");
        setSigner({ title: "Mr", first_name: fallbackFirst, last_name: fallbackLast, email: c.email ?? "", mobile: c.phone ?? "" });
      }
    }
    // Prefill partner signer from the logged-in admin.
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", session.user.id)
        .maybeSingle();
      const p = profile as { first_name?: string; last_name?: string; email?: string } | null;
      setPartner({
        title: "Mr",
        first_name: p?.first_name ?? "",
        last_name: p?.last_name ?? "",
        email: p?.email ?? session.user.email ?? "",
        mobile: "",
      });
    }
    await loadConfig();
    setLoading(false);
  };

  const loadConfig = async () => {
    const { data, error } = await supabase.functions.invoke("grenke-api", {
      body: { action: "get_esignature_config", environment: "production", offer_id: offerId },
    });
    let body = (data ?? null) as ConfigResponse | null;
    if (error) {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx?.json) { try { body = await ctx.json(); } catch { /* */ } }
    }
    setConfig(body);
  };

  const handleSend = async () => {
    if (!signer.first_name || !signer.last_name || !signer.email) {
      toast.error("Renseignez nom, prénom et email du signataire.");
      return;
    }
    const ok = window.confirm(
      `Envoyer le contrat pour signature DocuSign à :\n\n` +
      `  ${signer.first_name} ${signer.last_name}\n  ${signer.email}\n\n` +
      `Le client recevra une invitation DocuSign. Continuer ?`,
    );
    if (!ok) return;

    // iTakecare always signs as the supplier (fournisseur) in Grenke's flow,
    // so we always send the partner signee. The delivery confirmation (bon de
    // livraison) is part of the same DocuSign envelope.
    try {
      setSending(true);
      const { data, error } = await supabase.functions.invoke("grenke-api", {
        body: {
          action: "start_esignature",
          environment: "production",
          offer_id: offerId,
          payload: {
            customer: signer,
            partner,
            use_delivery_confirmation: true,
          },
        },
      });
      let body = (data ?? null) as { success?: boolean; error?: string; message?: string; grenke_response?: unknown; documents_pending?: unknown } | null;
      if (error) {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx?.json) { try { body = await ctx.json(); } catch { /* */ } }
      }
      if (body?.success) {
        toast.success("Contrat envoyé pour signature DocuSign ✅");
        onSent?.();
      } else if (body?.error === "documents_pending") {
        toast.error("Des documents demandés ne sont pas encore validés.");
        await loadConfig();
      } else {
        toast.error(
          <div>
            <strong>Envoi e-signature échoué</strong>
            <p className="text-sm mt-1">{body?.message ?? body?.error ?? "Erreur inconnue"}</p>
          </div>,
          { duration: 12000 },
        );
      }
    } catch (e) {
      console.error("[GrenkeESignaturePanel] send error:", e);
      toast.error("Erreur inattendue");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Chargement de la configuration e-signature…
      </div>
    );
  }

  const pending = config?.documents_pending ?? [];
  const canSend = config?.can_send ?? false;

  const field = (label: string, val: string, set: (v: string) => void, type = "text") => (
    <div className="space-y-0.5">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input value={val} onChange={(e) => set(e.target.value)} type={type} className="h-7 text-xs" />
    </div>
  );

  const signerForm = (s: Signer, setS: (s: Signer) => void, heading: string) => (
    <div className="space-y-2">
      <div className="text-xs font-medium">{heading}</div>
      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Titre</Label>
          <select
            value={s.title}
            onChange={(e) => setS({ ...s, title: e.target.value })}
            className="h-7 w-full text-xs rounded-md border border-input bg-background px-2"
          >
            {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {field("Prénom", s.first_name, (v) => setS({ ...s, first_name: v }))}
        {field("Nom", s.last_name, (v) => setS({ ...s, last_name: v }))}
        {field("Mobile", s.mobile, (v) => setS({ ...s, mobile: v }))}
      </div>
      {field("Email", s.email, (v) => setS({ ...s, email: v }), "email")}
    </div>
  );

  return (
    <div className="mt-3 rounded-lg border bg-background p-3 space-y-3">
      <div className="flex items-center gap-2">
        <PenLine className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium">Envoyer le contrat pour signature (DocuSign)</span>
      </div>

      {/* Document checklist */}
      {pending.length > 0 ? (
        <Alert variant="default" className="border-amber-500/30 bg-amber-50/30">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 text-sm">Documents en attente de validation</AlertTitle>
          <AlertDescription className="text-xs text-amber-700">
            <ul className="mt-1 space-y-0.5">
              {pending.map((d, i) => (
                <li key={i}>
                  {DOC_LABELS[d.document_type] ?? d.document_type} —{" "}
                  <span className="font-medium">{d.status === "rejected" ? "rejeté" : "en attente"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1">L'envoi sera possible une fois tous les documents validés.</p>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Tous les documents requis sont validés.
        </div>
      )}

      {/* Signer forms — iTakecare (supplier) always signs in Grenke's flow. */}
      {signerForm(signer, setSigner, "Signataire client (contrat + bon de livraison)")}
      {signerForm(partner, setPartner, "Signataire fournisseur (iTakecare)")}

      <Button
        size="sm"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        onClick={handleSend}
        disabled={sending || !canSend}
      >
        {sending ? <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" /> : <PenLine className="h-3.5 w-3.5 mr-2" />}
        Envoyer pour signature DocuSign
      </Button>
    </div>
  );
}
