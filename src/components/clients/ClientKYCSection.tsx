import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  ClientKycReport,
  KYC_FIELD_MAPPING,
  KycExtraction,
  KycSource,
  getKycReportFileUrl,
  listKycReports,
  runAutoLookup,
  uploadKycPdfAndAnalyze,
  validateKycReport,
} from "@/services/clients/clientKycService";

interface ClientKYCSectionProps {
  client: any;
  onClientUpdate?: (updates: Record<string, any>) => void;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  societe: "Société",
  independant: "Indépendant",
  asbl: "ASBL",
  autre: "Autre",
};

const SOURCE_LABELS: Record<KycSource, string> = {
  graydon: "Rapport Graydon",
  companyweb: "Rapport CompanyWeb",
  pdf_other: "Autre rapport PDF",
  auto_lookup: "Lookup automatique BCE/SIRENE",
};

const STATUS_VARIANTS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  pending: { label: "En attente", variant: "secondary" },
  analyzing: { label: "Analyse en cours…", variant: "outline" },
  analyzed: { label: "À valider", variant: "default", className: "bg-amber-500 text-white" },
  failed: { label: "Échec", variant: "destructive" },
  validated: { label: "Validé", variant: "default", className: "bg-emerald-500 text-white" },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-BE", { dateStyle: "medium", timeStyle: "short" });
}

const ACCEPTED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 15 * 1024 * 1024;

const ClientKYCSection: React.FC<ClientKYCSectionProps> = ({ client, onClientUpdate }) => {
  const [reports, setReports] = useState<ClientKycReport[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [reviewReport, setReviewReport] = useState<ClientKycReport | null>(null);
  const [selectedSource, setSelectedSource] = useState<Exclude<KycSource, "auto_lookup">>("graydon");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    if (!client?.id) return;
    setLoadingList(true);
    try {
      const list = await listKycReports(client.id);
      setReports(list);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger l'historique KYC");
    } finally {
      setLoadingList(false);
    }
  }, [client?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFileChosen = async (file: File | null) => {
    if (!file) return;
    if (!ACCEPTED_MIME.includes(file.type)) {
      toast.error("Format non supporté (PDF, PNG, JPEG, WEBP uniquement)");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop lourd (max 15 Mo)");
      return;
    }
    setIsUploading(true);
    const toastId = toast.loading("Upload + analyse IA en cours…");
    try {
      const report = await uploadKycPdfAndAnalyze({
        clientId: client.id,
        companyId: client.company_id,
        file,
        source: selectedSource,
      });
      toast.success("Analyse terminée — vérifie les valeurs proposées", { id: toastId });
      await refresh();
      setReviewReport(report);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Échec de l'analyse", { id: toastId });
      await refresh();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAutoLookup = async () => {
    if (!client?.vat_number) {
      toast.error("Renseigne d'abord le numéro de TVA du client");
      return;
    }
    setIsLookingUp(true);
    const toastId = toast.loading("Lookup BCE/SIRENE en cours…");
    try {
      const report = await runAutoLookup(client.id);
      toast.success("Données récupérées — vérifie ce qui s'applique", { id: toastId });
      await refresh();
      setReviewReport(report);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Échec du lookup", { id: toastId });
      await refresh();
    } finally {
      setIsLookingUp(false);
    }
  };

  const lastValidated = useMemo(
    () => reports.find((r) => r.status === "validated"),
    [reports],
  );

  return (
    <div className="space-y-6">
      {/* État actuel KYC */}
      <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
        <CardHeader className="bg-muted/50 pb-4 border-b">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            KYC société
          </CardTitle>
          <CardDescription>
            Analyse d'un rapport (Graydon, CompanyWeb, autre) ou lookup automatique BCE/SIRENE pour
            compléter et fiabiliser la fiche client.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FieldStat
              label="Type d'entité"
              value={client.entity_type ? ENTITY_TYPE_LABELS[client.entity_type] : null}
            />
            <FieldStat label="Forme juridique" value={client.legal_form} />
            <FieldStat
              label="Date de création"
              value={
                client.company_creation_date
                  ? new Date(client.company_creation_date).toLocaleDateString("fr-BE")
                  : null
              }
              icon={CalendarClock}
            />
            <FieldStat
              label="Dernier KYC validé"
              value={
                client.kyc_validated_at
                  ? new Date(client.kyc_validated_at).toLocaleDateString("fr-BE")
                  : null
              }
            />
          </div>

          {!client.vat_number && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                Renseigne le numéro de TVA dans l'onglet "Informations générales" pour activer le
                lookup automatique BCE/SIRENE.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions d'analyse */}
      <Card className="shadow-md border-none">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-base">Lancer une analyse</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm">Lookup automatique</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Interroge la BCE (Belgique), SIRENE (France) ou le registre LU à partir du numéro de
                TVA. Gratuit, instantané.
              </p>
              <Button
                onClick={handleAutoLookup}
                disabled={isLookingUp || !client.vat_number}
                size="sm"
                className="w-full"
              >
                {isLookingUp && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                Lancer le lookup
              </Button>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm">Upload rapport (analyse IA)</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                PDF Graydon ou CompanyWeb (préféré pour l'extraction financière complète).
                Max 15 Mo. Claude analyse le document.
              </p>
              <div className="flex gap-2">
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value as any)}
                  disabled={isUploading}
                  className="flex h-9 rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                >
                  <option value="graydon">Graydon</option>
                  <option value="companyweb">CompanyWeb</option>
                  <option value="pdf_other">Autre PDF</option>
                </select>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFileChosen(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-1"
                >
                  {isUploading && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                  Choisir un fichier
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique */}
      <Card className="shadow-md border-none">
        <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base">Historique des analyses</CardTitle>
          {reports.length > 0 && (
            <Badge variant="outline">
              {reports.length} analyse{reports.length > 1 ? "s" : ""}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {loadingList && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
              Chargement…
            </div>
          )}

          {!loadingList && reports.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Aucune analyse pour ce client. Lance un lookup ou uploade un rapport.
            </div>
          )}

          {!loadingList &&
            reports.map((r) => {
              const status = STATUS_VARIANTS[r.status] || STATUS_VARIANTS.pending;
              const canReview = r.status === "analyzed";
              return (
                <div
                  key={r.id}
                  className="border-b last:border-b-0 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted p-2">
                      {r.source === "auto_lookup" ? (
                        <Search className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{SOURCE_LABELS[r.source]}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(r.created_at)}
                        {r.file_size ? ` • ${formatBytes(r.file_size)}` : ""}
                      </div>
                      {r.error_message && (
                        <div className="text-xs text-destructive mt-1">{r.error_message}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant} className={status.className}>
                      {status.label}
                    </Badge>
                    {r.file_path && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const url = await getKycReportFileUrl(r.file_path!);
                          if (url) window.open(url, "_blank");
                          else toast.error("Lien indisponible");
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    {(canReview || r.status === "validated") && r.ai_extraction && (
                      <Button
                        variant={canReview ? "default" : "outline"}
                        size="sm"
                        onClick={() => setReviewReport(r)}
                      >
                        {canReview ? "Vérifier & valider" : "Voir"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      <ReviewDiffDialog
        report={reviewReport}
        client={client}
        onClose={() => setReviewReport(null)}
        onValidated={async (appliedFields) => {
          if (Object.keys(appliedFields).length > 0) {
            onClientUpdate?.(appliedFields);
          }
          setReviewReport(null);
          await refresh();
        }}
      />
    </div>
  );
};

const FieldStat: React.FC<{ label: string; value: string | null; icon?: React.ComponentType<any> }> = ({
  label,
  value,
  icon: Icon = Building2,
}) => (
  <div className="rounded-lg border p-3 bg-muted/30">
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      <Icon className="h-3 w-3" />
      {label}
    </div>
    <div className={`text-sm font-medium ${value ? "" : "text-muted-foreground italic"}`}>
      {value || "Non renseigné"}
    </div>
  </div>
);

interface ReviewDiffDialogProps {
  report: ClientKycReport | null;
  client: any;
  onClose: () => void;
  onValidated: (appliedFields: Record<string, any>) => void;
}

const ReviewDiffDialog: React.FC<ReviewDiffDialogProps> = ({ report, client, onClose, onValidated }) => {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const extraction = report?.ai_extraction as KycExtraction | null;
  const isReadOnly = report?.status === "validated";

  // Auto-cocher les champs où la proposition diffère de la valeur actuelle ET a une confiance >= 0.6
  useEffect(() => {
    if (!extraction || !report) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const m of KYC_FIELD_MAPPING) {
      const proposed = extraction[m.extractionKey];
      const current = client[m.clientField];
      const confidence = (extraction.confidence as any)[m.extractionKey] ?? 0;
      const hasProposal = proposed !== null && proposed !== undefined && proposed !== "";
      const isDifferent = String(current ?? "").trim() !== String(proposed ?? "").trim();
      next[m.clientField] = hasProposal && isDifferent && confidence >= 0.6 && !isReadOnly;
    }
    setSelected(next);
  }, [extraction, client, report, isReadOnly]);

  if (!report || !extraction) return null;

  const handleValidate = async () => {
    const fieldsToApply: Record<string, any> = {};
    for (const m of KYC_FIELD_MAPPING) {
      if (selected[m.clientField]) {
        const v = extraction[m.extractionKey];
        fieldsToApply[m.clientField] = v;
      }
    }
    setIsSaving(true);
    try {
      await validateKycReport({
        reportId: report.id,
        clientId: report.client_id,
        fieldsToApply,
      });
      const appliedCount = Object.keys(fieldsToApply).length;
      toast.success(
        appliedCount > 0
          ? `${appliedCount} champ${appliedCount > 1 ? "s" : ""} appliqué${appliedCount > 1 ? "s" : ""} au client`
          : "Rapport validé (aucun champ modifié)",
      );
      onValidated(fieldsToApply);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Échec de la validation");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isReadOnly ? "Rapport validé" : "Vérification des champs proposés"}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? "Ce rapport a déjà été validé. Voici ce qui avait été extrait."
              : "Coche les champs que tu veux appliquer à la fiche client. Les champs déjà cochés sont ceux qui apportent une nouvelle valeur fiable."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {KYC_FIELD_MAPPING.map((m) => {
            const proposed = extraction[m.extractionKey];
            const current = client[m.clientField];
            const confidence = (extraction.confidence as any)[m.extractionKey] ?? 0;
            const hasProposal = proposed !== null && proposed !== undefined && proposed !== "";
            const isDifferent = String(current ?? "").trim() !== String(proposed ?? "").trim();

            const formatVal = (v: any): string => {
              if (v === null || v === undefined || v === "") return "—";
              if (m.clientField === "entity_type" && typeof v === "string") {
                return ENTITY_TYPE_LABELS[v] || v;
              }
              if (m.clientField === "company_creation_date" && typeof v === "string") {
                try {
                  return new Date(v).toLocaleDateString("fr-BE");
                } catch {
                  return v;
                }
              }
              return String(v);
            };

            return (
              <div
                key={m.clientField}
                className={`grid grid-cols-12 gap-3 items-center p-3 rounded-md border ${
                  hasProposal && isDifferent ? "bg-blue-50/50" : "bg-muted/20"
                }`}
              >
                <div className="col-span-1 flex justify-center">
                  <Checkbox
                    checked={!!selected[m.clientField]}
                    disabled={!hasProposal || isReadOnly}
                    onCheckedChange={(c) =>
                      setSelected((s) => ({ ...s, [m.clientField]: c === true }))
                    }
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs text-muted-foreground">{m.label}</Label>
                  {confidence > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Confiance {Math.round(confidence * 100)}%
                    </div>
                  )}
                </div>
                <div className="col-span-4 text-sm">
                  <div className="text-[10px] uppercase text-muted-foreground">Actuel</div>
                  <div className={current ? "" : "italic text-muted-foreground"}>
                    {formatVal(current)}
                  </div>
                </div>
                <div className="col-span-4 text-sm">
                  <div className="text-[10px] uppercase text-muted-foreground">Proposé</div>
                  <div
                    className={
                      hasProposal && isDifferent
                        ? "font-medium text-blue-900"
                        : hasProposal
                          ? ""
                          : "italic text-muted-foreground"
                    }
                  >
                    {formatVal(proposed)}
                  </div>
                </div>
              </div>
            );
          })}

          {extraction.warnings && extraction.warnings.length > 0 && (
            <>
              <Separator />
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-1">
                <div className="font-medium text-sm text-amber-900 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Alertes détectées par l'IA
                </div>
                <ul className="text-xs text-amber-900 list-disc pl-5 space-y-1">
                  {extraction.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {(extraction.financial_indicators?.revenue ||
            extraction.financial_indicators?.equity ||
            extraction.directors?.length) && (
            <>
              <Separator />
              <div className="rounded-md bg-muted/30 p-3 space-y-2">
                <div className="text-xs text-muted-foreground font-medium">
                  Données complémentaires (informatif, non sauvegardées)
                </div>
                {extraction.financial_indicators && (
                  <div className="text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                    {extraction.financial_indicators.revenue !== null && (
                      <div>
                        <div className="text-[10px] text-muted-foreground">CA</div>
                        <div>
                          {extraction.financial_indicators.revenue.toLocaleString("fr-BE")} €
                        </div>
                      </div>
                    )}
                    {extraction.financial_indicators.net_result !== null && (
                      <div>
                        <div className="text-[10px] text-muted-foreground">Résultat net</div>
                        <div>
                          {extraction.financial_indicators.net_result.toLocaleString("fr-BE")} €
                        </div>
                      </div>
                    )}
                    {extraction.financial_indicators.equity !== null && (
                      <div>
                        <div className="text-[10px] text-muted-foreground">Fonds propres</div>
                        <div>
                          {extraction.financial_indicators.equity.toLocaleString("fr-BE")} €
                        </div>
                      </div>
                    )}
                    {extraction.financial_indicators.employees !== null && (
                      <div>
                        <div className="text-[10px] text-muted-foreground">Employés</div>
                        <div>{extraction.financial_indicators.employees}</div>
                      </div>
                    )}
                  </div>
                )}
                {extraction.directors && extraction.directors.length > 0 && (
                  <div className="text-sm">
                    <div className="text-[10px] text-muted-foreground mb-1">Dirigeants</div>
                    <ul className="list-disc pl-5 text-xs space-y-0.5">
                      {extraction.directors.map((d, i) => (
                        <li key={i}>
                          {d.name}
                          {d.role ? ` — ${d.role}` : ""}
                          {d.since ? ` (depuis ${d.since})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isReadOnly ? "Fermer" : "Annuler"}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleValidate} disabled={isSaving}>
              {isSaving && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Appliquer & valider
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientKYCSection;
