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

// Split a full name into prénom / nom. Splits on ANY whitespace run (\s also
// matches non-breaking spaces & co), so names saved with a U+00A0 between the
// words still parse — a plain split(" ") would dump the whole string in first.
const splitName = (full: string): { first: string; last: string } => {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
};

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

// A selectable client-side signer: the main client contact plus any
// collaborators (people in the company with signing authority).
interface SignerOption {
  id: string;
  label: string;
  signer: Signer;
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
  const [signerOptions, setSignerOptions] = useState<SignerOption[]>([]);
  const [selectedSignerId, setSelectedSignerId] = useState<string>("client");

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
      const options: SignerOption[] = [];
      if (c) {
        const parsed = splitName(c.name ?? "");
        const fallbackFirst = c.first_name || parsed.first;
        const fallbackLast = c.last_name || parsed.last;
        const main: Signer = { title: "Mr", first_name: fallbackFirst, last_name: fallbackLast, email: c.email ?? "", mobile: c.phone ?? "" };
        setSigner(main);
        const mainName = `${fallbackFirst} ${fallbackLast}`.trim() || c.name || "Contact principal";
        options.push({ id: "client", label: `${mainName} — contact principal`, signer: main });
      }
      // Other people in the company with signing authority (collaborators).
      const { data: collabs } = await supabase
        .from("collaborators")
        .select("id, name, email, phone, role, is_primary")
        .eq("client_id", clientId);
      for (const collab of (collabs ?? []) as Array<{ id: string; name?: string; email?: string; phone?: string; role?: string; is_primary?: boolean }>) {
        // Skip the primary collaborator: it duplicates the main client contact
        // already listed first (sourced from the clients table, with a better email).
        if (collab.is_primary) continue;
        const name = (collab.name ?? "").trim();
        if (!name) continue;
        const { first, last } = splitName(name);
        options.push({
          id: collab.id,
          label: collab.role ? `${name} — ${collab.role}` : name,
          signer: { title: "Mr", first_name: first, last_name: last, email: collab.email ?? "", mobile: collab.phone ?? "" },
        });
      }
      setSignerOptions(options);
      setSelectedSignerId("client");
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

  const handleSelectSigner = (id: string) => {
    setSelectedSignerId(id);
    const opt = signerOptions.find((o) => o.id === id);
    if (opt) setSigner(opt.signer);
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

  const signerForm = (s: Signer, setS: (s: Signer) => void, heading: string, selector?: React.ReactNode) => (
    <div className="space-y-2">
      <div className="text-xs font-medium">{heading}</div>
      {selector}
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
      {signerForm(
        signer,
        setSigner,
        "Signataire client (contrat + bon de livraison)",
        signerOptions.length > 1 ? (
          <div className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">Personne habilitée à signer</Label>
            <select
              value={selectedSignerId}
              onChange={(e) => handleSelectSigner(e.target.value)}
              className="h-7 w-full text-xs rounded-md border border-input bg-background px-2"
            >
              {signerOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        ) : undefined,
      )}
      {signerForm(partner, setPartner, "Signataire fournisseur (iTakecare)")}

      <Button
        size="sm"
        className="w-full"
        onClick={handleSend}
        disabled={sending || !canSend}
      >
        {sending ? <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" /> : <PenLine className="h-3.5 w-3.5 mr-2" />}
        Envoyer pour signature DocuSign
      </Button>
    </div>
  );
}
