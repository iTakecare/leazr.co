/**
 * LeaserDocumentSendCard
 *
 * Affiché sur la page de détail d'une facture dont le numéro correspond au
 * format Billit "ITC-{année}-{numéro}" (ex. ITC-2026-000123).
 *
 * Permet d'envoyer au bailleur :
 *  • les documents de la demande (carte d'identité, bilan, etc.)
 *  • des pièces jointes supplémentaires (fichiers locaux)
 *  • un email avec toutes les références contractuelles
 *
 * + deux confirmations manuelles :
 *  ✅ Contrat signé chez le bailleur
 *  ✅ Facture envoyée via Peppol
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Send,
  FileText,
  Paperclip,
  X,
  CheckCircle2,
  Loader2,
  Building2,
  MailCheck,
  FileBadge,
  Info,
  RefreshCw,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Eye,
  Edit3,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { updateInvoiceBillingData, type Invoice } from "@/services/invoiceService";
import { getOfferDocuments, DOCUMENT_TYPES, type OfferDocument } from "@/services/offers/offerDocuments";

// ── pattern detection ─────────────────────────────────────────────────────────
const ITC_PATTERN = /^ITC-\d{4}-\d+/;

// ── file → base64 ─────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
  });
}

// ── types ─────────────────────────────────────────────────────────────────────

interface ContractSnapshot {
  offer_id: string | null;
  leaser_id: string | null;
  leaser_name: string | null;
  contract_number: string | null;
}
interface OfferSnapshot {
  client_id: string | null;
  dossier_number: string | null;
  leaser_request_number: string | null;
  client_name: string | null;
}

interface ClientSnapshot {
  company: string | null;
  name: string;
}

interface LogoData {
  company_logo_url: string | null;
  leaser_logo_url: string | null;
}

interface OtherDoc {
  doc: OfferDocument;
  dossier_number: string | null;
  offer_id: string;
}

interface LeaserDocumentSendCardProps {
  invoice: Invoice;
  onUpdate: (updatedBillingData: any) => void;
}

// ── component ─────────────────────────────────────────────────────────────────

const LeaserDocumentSendCard: React.FC<LeaserDocumentSendCardProps> = ({
  invoice,
  onUpdate,
}) => {
  // Only show for ITC format invoices
  if (!invoice.invoice_number || !ITC_PATTERN.test(invoice.invoice_number)) return null;

  // ── data loading ──────────────────────────────────────────────────────────
  const [contractData, setContractData] = useState<ContractSnapshot | null>(null);
  const [offerData, setOfferData] = useState<OfferSnapshot | null>(null);
  const [clientData, setClientData] = useState<ClientSnapshot | null>(null);
  const [logoData, setLogoData] = useState<LogoData>({ company_logo_url: null, leaser_logo_url: null });
  const [offerDocs, setOfferDocs] = useState<OfferDocument[]>([]);
  const [otherClientDocs, setOtherClientDocs] = useState<OtherDoc[]>([]);
  const [showOtherDocs, setShowOtherDocs] = useState(false);
  const [leaserEmail, setLeaserEmail] = useState("");
  const [dataLoading, setDataLoading] = useState(true);

  // ── selection state ───────────────────────────────────────────────────────
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── CC emails ─────────────────────────────────────────────────────────────
  const [ccEmails, setCcEmails] = useState<string[]>([
    "hello@itakecare.be",
    "sales@itakecare.be",
  ]);

  // ── leaser_send data (persisted in billing_data) ──────────────────────────
  const leaserSend = invoice.billing_data?.leaser_send as Record<string, any> | undefined;

  // ── confirmation toggles ──────────────────────────────────────────────────
  const [peppolSent, setPeppolSent] = useState<boolean>(leaserSend?.peppol_sent ?? false);
  const [contractSigned, setContractSigned] = useState<boolean>(
    leaserSend?.leaser_contract_signed ?? false
  );
  const [togglingPeppol, setTogglingPeppol] = useState(false);
  const [togglingSign, setTogglingSign] = useState(false);

  // ── load contract + offer + leaser ───────────────────────────────────────
  useEffect(() => {
    if (!invoice.contract_id) {
      setDataLoading(false);
      return;
    }

    const load = async () => {
      setDataLoading(true);
      try {
        // Contract
        const { data: contract } = await supabase
          .from("contracts")
          .select("offer_id, leaser_id, leaser_name, contract_number")
          .eq("id", invoice.contract_id!)
          .single();

        if (!contract) { setDataLoading(false); return; }
        setContractData(contract as ContractSnapshot);

        // Leaser email + logo
        let leaserLogoUrl: string | null = null;
        if (contract.leaser_id) {
          const { data: leaser } = await supabase
            .from("leasers")
            .select("email, logo_url")
            .eq("id", contract.leaser_id)
            .single();
          if (leaser?.email) setLeaserEmail(leaser.email);
          leaserLogoUrl = leaser?.logo_url ?? null;
        }

        // Company logo (site_settings)
        const { data: siteSett } = await supabase
          .from("site_settings")
          .select("logo_url")
          .limit(1)
          .single();
        setLogoData({
          company_logo_url: siteSett?.logo_url ?? null,
          leaser_logo_url: leaserLogoUrl,
        });

        // Offer
        if (contract.offer_id) {
          const { data: offer } = await supabase
            .from("offers")
            .select("client_id, dossier_number, leaser_request_number, client_name")
            .eq("id", contract.offer_id)
            .single();
          if (offer) {
            setOfferData(offer as OfferSnapshot);
            // Fetch client company name
            if (offer.client_id) {
              const { data: client } = await supabase
                .from("clients")
                .select("company, name")
                .eq("id", offer.client_id)
                .single();
              if (client) setClientData(client as ClientSnapshot);
            }
          }

          // Offer documents (current offer)
          const docs = await getOfferDocuments(contract.offer_id);
          const approved = docs.filter((d) => d.status === "approved" || d.status === "pending");
          setOfferDocs(approved);
          // Pre-select all by default
          setSelectedDocIds(new Set(approved.map((d) => d.id)));

          // Documents d'autres demandes du même client
          if (offer?.client_id) {
            const { data: otherOffers } = await supabase
              .from("offers")
              .select("id, dossier_number")
              .eq("client_id", offer.client_id)
              .neq("id", contract.offer_id);

            if (otherOffers && otherOffers.length > 0) {
              const allOther: OtherDoc[] = [];
              for (const other of otherOffers) {
                const otherDocs = await getOfferDocuments(other.id);
                const otherApproved = otherDocs.filter(
                  (d) => d.status === "approved" || d.status === "pending"
                );
                allOther.push(
                  ...otherApproved.map((doc) => ({
                    doc,
                    dossier_number: other.dossier_number as string | null,
                    offer_id: other.id,
                  }))
                );
              }
              setOtherClientDocs(allOther);
            }
          }
        }
      } catch (e) {
        console.error("Erreur chargement données bailleur:", e);
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, [invoice.contract_id]);

  // Sync toggles when billing_data changes externally
  useEffect(() => {
    const ls = invoice.billing_data?.leaser_send;
    if (ls) {
      setPeppolSent(ls.peppol_sent ?? false);
      setContractSigned(ls.leaser_contract_signed ?? false);
    }
  }, [invoice.billing_data?.leaser_send]);

  // ── persist a leaser_send field ───────────────────────────────────────────
  const patchLeaserSend = useCallback(
    async (patch: Record<string, unknown>) => {
      const updated = {
        ...(invoice.billing_data ?? {}),
        leaser_send: {
          ...(invoice.billing_data?.leaser_send ?? {}),
          ...patch,
        },
      };
      await updateInvoiceBillingData(invoice.id, updated);
      onUpdate(updated);
    },
    [invoice.billing_data, invoice.id, onUpdate]
  );

  // ── toggles ───────────────────────────────────────────────────────────────
  const handlePeppolToggle = async (val: boolean) => {
    setTogglingPeppol(true);
    try {
      await patchLeaserSend({
        peppol_sent: val,
        peppol_sent_at: val ? new Date().toISOString() : null,
      });
      setPeppolSent(val);
      toast.success(val ? "Facture Peppol confirmée" : "Statut Peppol retiré");
    } catch {
      toast.error("Erreur mise à jour");
    } finally {
      setTogglingPeppol(false);
    }
  };

  const handleSignedToggle = async (val: boolean) => {
    setTogglingSign(true);
    try {
      await patchLeaserSend({
        leaser_contract_signed: val,
        leaser_contract_signed_at: val ? new Date().toISOString() : null,
      });
      setContractSigned(val);
      toast.success(val ? "Signature bailleur confirmée" : "Statut signature retiré");
    } catch {
      toast.error("Erreur mise à jour");
    } finally {
      setTogglingSign(false);
    }
  };

  // ── file handling ─────────────────────────────────────────────────────────
  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAdditionalFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...files.filter((f) => !existing.has(f.name))];
    });
    e.target.value = "";
  };

  const removeFile = (name: string) =>
    setAdditionalFiles((prev) => prev.filter((f) => f.name !== name));

  const toggleDoc = (id: string) =>
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Preview email modal state ─────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [previewAttachmentNames, setPreviewAttachmentNames] = useState<string[]>([]);
  const [editedSubject, setEditedSubject] = useState<string>("");
  const [editedMessage, setEditedMessage] = useState<string>("");
  const [showEdit, setShowEdit] = useState(false);

  // Corps JSON commun (preview + envoi réel)
  const buildRequestBody = useCallback(async (opts: { preview: boolean; subject?: string; message?: string }) => {
    const additionalB64 = await Promise.all(
      additionalFiles.map(async (f) => ({
        name: f.name,
        content: await fileToBase64(f),
        type: f.type,
      }))
    );
    return {
      invoice_id: invoice.id,
      leaser_email: leaserEmail.trim(),
      leaser_name: contractData?.leaser_name ?? "",
      cc_emails: ccEmails.map((e) => e.trim()).filter(Boolean),
      document_ids: Array.from(selectedDocIds),
      additional_files: additionalB64,
      invoice_info: {
        invoice_number: invoice.invoice_number,
        contract_number: contractData?.contract_number ?? "",
        dossier_number: offerData?.dossier_number ?? "",
        leaser_request_number: offerData?.leaser_request_number ?? "",
        client_name:
          offerData?.client_name ?? invoice.billing_data?.client_data?.name ?? "",
        client_company: clientData?.company ?? null,
        amount: invoice.amount,
      },
      custom_message: opts.message ?? (customMessage.trim() || undefined),
      custom_subject: opts.subject ?? undefined,
      preview_only: opts.preview,
      peppol_sent: peppolSent,
      contract_signed: contractSigned,
      company_logo_url: logoData.company_logo_url,
      leaser_logo_url: logoData.leaser_logo_url,
    };
  }, [
    additionalFiles, invoice, leaserEmail, contractData, ccEmails, selectedDocIds,
    offerData, clientData, customMessage, peppolSent, contractSigned, logoData,
  ]);

  // Validation commune
  const validateSend = () => {
    if (!leaserEmail.trim()) { toast.error("Email du bailleur requis"); return false; }
    if (selectedDocIds.size === 0 && additionalFiles.length === 0) {
      toast.error("Sélectionnez au moins un document"); return false;
    }
    return true;
  };

  // ── Ouvrir la preview ─────────────────────────────────────────────────────
  const handleOpenPreview = async () => {
    if (!validateSend()) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setShowEdit(false);
    try {
      const body = await buildRequestBody({ preview: true });
      const { data, error } = await supabase.functions.invoke("send-leaser-documents", { body });
      if (error) throw new Error(error.message);
      if (!data?.preview) throw new Error(data?.error ?? "Erreur génération aperçu");
      setPreviewHtml(data.html ?? "");
      setPreviewSubject(data.subject ?? "");
      setEditedSubject(data.subject ?? "");
      setEditedMessage(customMessage);
      setPreviewAttachmentNames(data.attachment_names ?? []);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de la génération de l'aperçu");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Rafraîchir l'aperçu après modifs ──────────────────────────────────────
  const refreshPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const body = await buildRequestBody({
        preview: true,
        subject: editedSubject.trim() || undefined,
        message: editedMessage.trim() || undefined,
      });
      const { data, error } = await supabase.functions.invoke("send-leaser-documents", { body });
      if (error) throw new Error(error.message);
      if (!data?.preview) throw new Error(data?.error ?? "Erreur génération aperçu");
      setPreviewHtml(data.html ?? "");
      setPreviewSubject(data.subject ?? "");
      setPreviewAttachmentNames(data.attachment_names ?? []);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors du rafraîchissement");
    } finally {
      setPreviewLoading(false);
    }
  }, [buildRequestBody, editedSubject, editedMessage]);

  // ── Confirmer l'envoi depuis la modale ────────────────────────────────────
  const handleConfirmSend = async () => {
    setSending(true);
    try {
      const body = await buildRequestBody({
        preview: false,
        subject: editedSubject.trim() || undefined,
        message: editedMessage.trim() || undefined,
      });
      const { data, error } = await supabase.functions.invoke("send-leaser-documents", { body });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? "Erreur inconnue");

      toast.success(`Documents envoyés au bailleur (${data.sent} pièce${data.sent > 1 ? "s" : ""})`);
      const patchedBilling = {
        ...(invoice.billing_data ?? {}),
        leaser_send: {
          ...(invoice.billing_data?.leaser_send ?? {}),
          sent_at: new Date().toISOString(),
          sent_to: leaserEmail.trim(),
          documents_count: data.sent,
        },
      };
      onUpdate(patchedBilling);
      setAdditionalFiles([]);
      setPreviewOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Card className="border-indigo-200 bg-indigo-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-indigo-600" />
          Envoi bailleur
          <Badge
            variant="outline"
            className="ml-1 font-mono text-[11px] border-indigo-300 text-indigo-700"
          >
            {invoice.invoice_number}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Envoyez les documents contractuels au bailleur par email
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sent indicator */}
        {leaserSend?.sent_at && (
          <Alert className="py-2 border-emerald-200 bg-emerald-50">
            <MailCheck className="h-3.5 w-3.5 text-emerald-600" />
            <AlertDescription className="text-xs text-emerald-800 ml-1">
              Dernière envoi le{" "}
              <strong>
                {format(new Date(leaserSend.sent_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
              </strong>
              {leaserSend.sent_to && ` → ${leaserSend.sent_to}`}
              {leaserSend.documents_count != null &&
                ` (${leaserSend.documents_count} document${leaserSend.documents_count > 1 ? "s" : ""})`}
            </AlertDescription>
          </Alert>
        )}

        {dataLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── Documents de la demande ─────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  Documents de la demande
                </Label>
                {offerDocs.length > 0 && (
                  <button
                    className="text-[11px] text-indigo-600 hover:underline"
                    onClick={() =>
                      selectedDocIds.size === offerDocs.length
                        ? setSelectedDocIds(new Set())
                        : setSelectedDocIds(new Set(offerDocs.map((d) => d.id)))
                    }
                  >
                    {selectedDocIds.size === offerDocs.length
                      ? "Tout désélectionner"
                      : "Tout sélectionner"}
                  </button>
                )}
              </div>

              {offerDocs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-2 py-1">
                  {invoice.contract_id
                    ? "Aucun document approuvé trouvé pour cette demande."
                    : "Facture non liée à un contrat — documents indisponibles."}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {offerDocs.map((doc) => (
                    <label
                      key={doc.id}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors text-xs ${
                        selectedDocIds.has(doc.id)
                          ? "bg-indigo-100/80 border border-indigo-200"
                          : "bg-white border border-transparent hover:border-slate-200"
                      }`}
                    >
                      <Checkbox
                        checked={selectedDocIds.has(doc.id)}
                        onCheckedChange={() => toggleDoc(doc.id)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="truncate flex-1">
                        {DOCUMENT_TYPES[doc.document_type] ?? doc.document_type}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {(doc.file_size / 1024).toFixed(0)} KB
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* ── Suggestions : docs d'autres demandes du même client ─── */}
            {otherClientDocs.length > 0 && (
              <div>
                <button
                  onClick={() => setShowOtherDocs((v) => !v)}
                  className="w-full flex items-center gap-1.5 mb-2 text-left"
                >
                  {showOtherDocs
                    ? <ChevronDown className="h-3.5 w-3.5 text-amber-600" />
                    : <ChevronRight className="h-3.5 w-3.5 text-amber-600" />
                  }
                  <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700 flex-1">
                    Documents d'autres demandes de ce client
                  </span>
                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                    {otherClientDocs.length} disponible{otherClientDocs.length > 1 ? "s" : ""}
                  </span>
                </button>

                {showOtherDocs && (
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1 border border-amber-100 rounded-lg p-1.5 bg-amber-50/30">
                    {/* Group by dossier */}
                    {Array.from(
                      new Map(otherClientDocs.map((o) => [o.offer_id, o.dossier_number])).entries()
                    ).map(([offerId, dossier]) => {
                      const docsForOffer = otherClientDocs.filter((o) => o.offer_id === offerId);
                      return (
                        <div key={offerId}>
                          {/* Demande header */}
                          <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                            <FolderKanban className="h-3 w-3 text-amber-500" />
                            {dossier ?? "Demande sans numéro"}
                          </div>
                          {docsForOffer.map(({ doc }) => (
                            <label
                              key={doc.id}
                              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                                selectedDocIds.has(doc.id)
                                  ? "bg-amber-100 border border-amber-300"
                                  : "bg-white border border-transparent hover:border-amber-200"
                              }`}
                            >
                              <Checkbox
                                checked={selectedDocIds.has(doc.id)}
                                onCheckedChange={() => toggleDoc(doc.id)}
                                className="h-3.5 w-3.5"
                              />
                              <span className="truncate flex-1">
                                {DOCUMENT_TYPES[doc.document_type] ?? doc.document_type}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                {(doc.file_size / 1024).toFixed(0)} KB
                              </span>
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Pièces jointes supplémentaires ─────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                  Pièces jointes supplémentaires
                </Label>
                <button
                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Ajouter
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                onChange={handleFileAdd}
              />

              {additionalFiles.length === 0 ? (
                <div
                  className="border-2 border-dashed border-slate-200 rounded-lg py-3 px-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <p className="text-xs text-muted-foreground">
                    Cliquez pour ajouter des fichiers (PDF, images, Word, Excel)
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {additionalFiles.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center justify-between px-2.5 py-1.5 bg-white border rounded-md text-xs"
                    >
                      <span className="truncate flex-1 text-foreground">{f.name}</span>
                      <span className="text-muted-foreground mx-2 shrink-0">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button onClick={() => removeFile(f.name)}>
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                  <button
                    className="text-[11px] text-indigo-600 hover:underline mt-1 flex items-center gap-0.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    + Ajouter d'autres fichiers
                  </button>
                </div>
              )}
            </div>

            {/* ── Email du bailleur ───────────────────────────────────── */}
            <div>
              <Label className="text-xs font-semibold mb-1 block flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                Email du bailleur
              </Label>
              <Input
                type="email"
                value={leaserEmail}
                onChange={(e) => setLeaserEmail(e.target.value)}
                placeholder="bailleur@exemple.com"
                className="h-8 text-sm"
              />
              {!leaserEmail && (
                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Aucun email configuré pour ce bailleur — saisissez-le manuellement
                </p>
              )}
            </div>

            {/* ── CC emails ───────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MailCheck className="h-3.5 w-3.5 text-indigo-600" />
                  Copie (CC)
                </Label>
                <button
                  className="text-[11px] text-indigo-600 hover:underline"
                  onClick={() => setCcEmails((prev) => [...prev, ""])}
                >
                  + Ajouter
                </button>
              </div>
              <div className="space-y-1.5">
                {ccEmails.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setCcEmails((prev) =>
                          prev.map((v, i) => (i === idx ? e.target.value : v))
                        )
                      }
                      placeholder="copie@exemple.com"
                      className="h-7 text-xs flex-1"
                    />
                    <button
                      onClick={() =>
                        setCcEmails((prev) => prev.filter((_, i) => i !== idx))
                      }
                      title="Retirer"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Message personnalisé ────────────────────────────────── */}
            <div>
              <Label className="text-xs font-semibold mb-1 block text-muted-foreground">
                Message personnalisé (optionnel)
              </Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Ex : Veuillez trouver les documents pour le dossier Grenke n°..."
                className="text-sm resize-none h-16"
              />
            </div>

            {/* ── Récap références ────────────────────────────────────── */}
            <div className="bg-white border rounded-lg px-3 py-2 space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Références incluses dans l'email
              </p>
              {[
                ["Facture", invoice.invoice_number],
                ["Contrat", contractData?.contract_number],
                ["Demande", offerData?.dossier_number],
                ["Réf. bailleur", offerData?.leaser_request_number],
                [
                  "Client",
                  offerData?.client_name ?? invoice.billing_data?.client_data?.name,
                ],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-mono font-medium">{v}</span>
                  </div>
                ))}
            </div>

            {/* ── Preview + Send button ────────────────────────────────── */}
            <Button
              className="w-full h-9 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleOpenPreview}
              disabled={
                sending ||
                !leaserEmail.trim() ||
                (selectedDocIds.size === 0 && additionalFiles.length === 0)
              }
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : leaserSend?.sent_at ? (
                <RefreshCw className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {leaserSend?.sent_at ? "Revoir et renvoyer" : "Aperçu & envoyer"}
            </Button>
          </>
        )}

        {/* ── Confirmations ──────────────────────────────────────────── */}
        <Separator />

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Confirmations
          </p>

          {/* Contrat signé */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileBadge
                className={`h-4 w-4 ${contractSigned ? "text-emerald-600" : "text-muted-foreground"}`}
              />
              <div>
                <p className="text-sm font-medium">Contrat signé chez le bailleur</p>
                {leaserSend?.leaser_contract_signed_at && contractSigned && (
                  <p className="text-[11px] text-muted-foreground">
                    {format(
                      new Date(leaserSend.leaser_contract_signed_at),
                      "dd MMM yyyy",
                      { locale: fr }
                    )}
                  </p>
                )}
              </div>
            </div>
            <Switch
              checked={contractSigned}
              onCheckedChange={handleSignedToggle}
              disabled={togglingSign}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          {/* Peppol */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`h-4 w-4 ${peppolSent ? "text-blue-600" : "text-muted-foreground"}`}
              />
              <div>
                <p className="text-sm font-medium">Facture envoyée via Peppol</p>
                {leaserSend?.peppol_sent_at && peppolSent && (
                  <p className="text-[11px] text-muted-foreground">
                    {format(
                      new Date(leaserSend.peppol_sent_at),
                      "dd MMM yyyy",
                      { locale: fr }
                    )}
                  </p>
                )}
              </div>
            </div>
            <Switch
              checked={peppolSent}
              onCheckedChange={handlePeppolToggle}
              disabled={togglingPeppol}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        </div>
      </CardContent>

      {/* ── Modale d'aperçu de l'email ────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={(o) => { if (!o && !sending) setPreviewOpen(false); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-indigo-600" />
              Aperçu de l'email bailleur
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vérifiez le contenu avant envoi · {previewAttachmentNames.length} pièce{previewAttachmentNames.length > 1 ? "s" : ""} jointe{previewAttachmentNames.length > 1 ? "s" : ""}
            </p>
          </DialogHeader>

          {/* Metadata panel */}
          <div className="px-6 py-3 bg-slate-50 border-b text-sm space-y-2">
            <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
              <span className="text-xs font-medium text-muted-foreground pt-1.5">À</span>
              <span className="font-mono text-xs bg-white border border-slate-200 rounded px-2 py-1.5 truncate">
                {leaserEmail}
              </span>
            </div>
            {ccEmails.filter(Boolean).length > 0 && (
              <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                <span className="text-xs font-medium text-muted-foreground pt-1.5">CC</span>
                <span className="font-mono text-xs bg-white border border-slate-200 rounded px-2 py-1.5 truncate">
                  {ccEmails.filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
              <span className="text-xs font-medium text-muted-foreground pt-1.5">Sujet</span>
              {showEdit ? (
                <Input
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  onBlur={refreshPreview}
                  className="h-8 text-xs font-mono"
                />
              ) : (
                <span className="font-medium text-xs bg-white border border-slate-200 rounded px-2 py-1.5 truncate">
                  {previewSubject}
                </span>
              )}
            </div>
            {previewAttachmentNames.length > 0 && (
              <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                <span className="text-xs font-medium text-muted-foreground pt-1.5">Pièces</span>
                <div className="flex flex-wrap gap-1">
                  {previewAttachmentNames.map((n, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] font-mono bg-white">
                      <Paperclip className="h-2.5 w-2.5 mr-1" />{n}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Editable message section */}
          {showEdit && (
            <div className="px-6 py-3 border-b bg-amber-50/50">
              <Label className="text-xs font-medium mb-1.5 block flex items-center gap-1.5">
                <Edit3 className="h-3 w-3" />
                Message personnalisé (optionnel)
              </Label>
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                onBlur={refreshPreview}
                placeholder="Ajoutez un message qui apparaîtra dans l'email…"
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          )}

          {/* Rendered email preview */}
          <div className="flex-1 overflow-auto min-h-0 bg-slate-100 p-4">
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-sm">Génération de l'aperçu…</span>
              </div>
            ) : (
              <iframe
                srcDoc={previewHtml}
                title="Aperçu email"
                sandbox="allow-same-origin"
                className="w-full min-h-[500px] h-full bg-white border border-slate-200 rounded shadow-sm"
              />
            )}
          </div>

          <DialogFooter className="px-6 py-3 border-t bg-white flex-row items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (showEdit) {
                  // Reset on close edit
                  setEditedSubject(previewSubject);
                  setEditedMessage(customMessage);
                }
                setShowEdit(!showEdit);
              }}
              disabled={sending}
            >
              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
              {showEdit ? "Masquer l'édition" : "Modifier"}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(false)}
                disabled={sending}
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmSend}
                disabled={sending || previewLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {sending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Envoi…</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Envoyer maintenant</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LeaserDocumentSendCard;
