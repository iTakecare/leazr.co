import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Send, FileUp, RefreshCw, AlertTriangle, Radio, Mail, CheckCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import {
  previewBillitInvoice, createBillitInvoiceDraft, sendBillitInvoiceNow,
  type BillitInvoiceRecap, type Invoice,
} from "@/services/invoiceService";

const fmtEur = (n: number) => (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });

const ChannelBadge: React.FC<{ channel: "peppol" | "email" }> = ({ channel }) =>
  channel === "peppol" ? (
    <Badge className="bg-blue-100 text-blue-700 border-0 gap-1"><Radio className="h-3 w-3" /> Peppol</Badge>
  ) : (
    <Badge className="bg-violet-100 text-violet-700 border-0 gap-1"><Mail className="h-3 w-3" /> Email</Badge>
  );

const BillitInvoiceCard: React.FC<{
  invoice: Invoice;
  onUpdate: (patch: Partial<Invoice>) => void;
}> = ({ invoice, onUpdate }) => {
  const { companyId } = useMultiTenant();
  const [recap, setRecap] = useState<BillitInvoiceRecap | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);

  const inBillit = invoice.integration_type === "billit" && !!invoice.external_invoice_id;
  const sentChannel = (invoice.billing_data as any)?.billit_sent_channel as ("peppol" | "email" | null) | undefined;
  // « Déjà envoyée vers Billit » = un envoi RÉEL via Billit a eu lieu (action
  // "send", qui pose billit_sent_channel). invoice.status (sent/paid) reflète le
  // cycle de paiement CLIENT (Mollie pour le self-leasing, ou suivi interne) —
  // ça ne veut PAS dire que la facture est partie chez Billit. Une facture avec
  // seulement un brouillon Billit (inBillit=true, pas encore "send") doit
  // continuer à afficher le bouton « Envoyer via Peppol/email ».
  const alreadySent = !!sentChannel;

  const loadPreview = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      setRecap(await previewBillitInvoice(companyId, invoice.id));
    } catch (e: any) {
      toast.error(e.message || "Erreur de prévisualisation");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!companyId) return;
    setCreating(true);
    try {
      const r = await createBillitInvoiceDraft(companyId, invoice.id);
      onUpdate({ external_invoice_id: r.external_invoice_id, integration_type: "billit", pdf_url: r.pdf_url || invoice.pdf_url });
      toast.success(r.already ? "Déjà présente dans Billit (brouillon)." : "Brouillon créé dans Billit — rien n'a été envoyé au client.");
      if (r.recap) setRecap(r.recap);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la création du brouillon");
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async () => {
    if (!companyId) return;
    setSending(true);
    try {
      const r = await sendBillitInvoiceNow(companyId, invoice.id);
      onUpdate({ status: "sent" as any, sent_at: new Date().toISOString() });
      toast.success(`Facture envoyée via ${r.channel === "peppol" ? "Peppol" : "email"}${r.fallback ? " (repli mail : destinataire absent de Peppol)" : ""}.`);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4" /> Envoi via Billit
          {recap && <ChannelBadge channel={recap.channel} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alreadySent ? (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Facture déjà envoyée{sentChannel ? ` via ${sentChannel === "peppol" ? "Peppol" : "email"}` : ""}.
          </div>
        ) : (
          <>
            {!recap ? (
              <Button variant="outline" className="w-full" onClick={loadPreview} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Vérifier le destinataire & le canal
              </Button>
            ) : (
              <div className="space-y-3">
                {/* Récap destinataire */}
                <div className="rounded-lg border p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{recap.recipient.name}</span>
                    <ChannelBadge channel={recap.channel} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {recap.recipient.kind === "leaser" ? "Bailleur" : "Client"}
                    {recap.recipient.vat ? ` · TVA ${recap.recipient.vat}` : ""}
                    {recap.recipient.email ? ` · ${recap.recipient.email}` : ""}
                  </div>
                  {recap.recipient.address && <div className="text-xs text-muted-foreground">{recap.recipient.address}</div>}
                </div>

                {/* Lignes */}
                <div className="rounded-lg border divide-y text-xs">
                  {recap.lines.map((l, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 p-2">
                      <span className="min-w-0">{l.description}</span>
                      <span className="shrink-0 font-medium">{fmtEur(l.unit_excl * l.quantity)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-2 font-semibold bg-muted/40">
                    <span>Total HTVA</span><span>{fmtEur(recap.total_excl)}</span>
                  </div>
                </div>

                {/* Concordance Grenke : montants par bien = valeurs réelles du dossier */}
                {recap.grenke_aligned && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Montants par bien alignés sur le dossier Grenke
                  </div>
                )}

                {/* Warnings */}
                {recap.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                    <div className="flex items-center gap-1 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> À vérifier avant envoi</div>
                    {recap.warnings.map((w, i) => <div key={i}>• {w}</div>)}
                  </div>
                )}

                {/* Étape 1 : créer le brouillon */}
                {!inBillit ? (
                  <Button className="w-full" onClick={handleCreate} disabled={creating}>
                    {creating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileUp className="h-4 w-4 mr-2" />}
                    Pousser vers Billit (brouillon)
                  </Button>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" /> Brouillon créé dans Billit.
                      {invoice.pdf_url && (
                        <a href={invoice.pdf_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                          PDF <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {/* Étape 2 : envoyer (confirmation explicite) */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full" disabled={sending}>
                          {sending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                          Envoyer via {recap.channel === "peppol" ? "Peppol" : "email"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmer l'envoi de la facture</AlertDialogTitle>
                          <AlertDialogDescription>
                            La facture <strong>{recap.invoice_number}</strong> ({fmtEur(recap.total_excl)} HTVA) va être envoyée
                            à <strong>{recap.recipient.name}</strong> via <strong>{recap.channel === "peppol" ? "Peppol" : "email"}</strong>.
                            Cette action est définitive.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSend}>Envoyer maintenant</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BillitInvoiceCard;
