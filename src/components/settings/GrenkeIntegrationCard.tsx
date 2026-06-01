// Grenke Leasing API integration card.
//
// Shipping in Phase 1:
//   - Read current integration status (UAT / Production cert configured?)
//   - Paste cert PEM + key PEM, persist via set_grenke_credentials RPC
//     (which itself stores the PEMs in Supabase Vault, never in JSONB).
//   - "Test connection" button calls the grenke-api edge function with
//     action=echo to confirm mTLS handshake.
//
// Phase 2+ (later) will add: calculate, submit, status polling, doc upload.
//
// See: docs/grenke-api/INTEGRATION.md

import React, { useEffect, useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  ShieldCheck,
  ExternalLink,
  Clock,
  Calculator,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GrenkeFieldMappings from "./GrenkeFieldMappings";

type Environment = "uat" | "production";

interface IntegrationStatus {
  configured: boolean;
  is_enabled: boolean;
  updated_at?: string;
  environments: { uat: boolean; production: boolean };
  uat_configured_at?: string | null;
  prod_configured_at?: string | null;
}

const ENV_LABELS: Record<Environment, string> = {
  uat: "Test (UAT)",
  production: "Production",
};

export default function GrenkeIntegrationCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<Environment | null>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  const [activeTab, setActiveTab] = useState<Environment>("uat");
  const [certPem, setCertPem] = useState("");
  const [keyPem, setKeyPem] = useState("");

  // Calculator playground state (Phase 2)
  const [calcAmount, setCalcAmount] = useState<string>("3000");
  const [calcPeriod, setCalcPeriod] = useState<string>("36");
  const [calcEnv, setCalcEnv] = useState<Environment>("production");
  const [calcRunning, setCalcRunning] = useState(false);
  const [calcResult, setCalcResult] = useState<
    | null
    | {
        success: boolean;
        items?: Array<{ Period: number; MonthlyTotalInstalment: number; FinancingAmount: number; Currency: string }>;
        error?: string;
        message?: string;
      }
  >(null);

  // Reference data refresh state (Phase 3a)
  const [refSyncing, setRefSyncing] = useState(false);
  const [refResult, setRefResult] = useState<
    | null
    | {
        success: boolean;
        legalforms: { ok: boolean; count: number; error?: string };
        objecttypes: { ok: boolean; count: number; error?: string };
        customslas: { ok: boolean; count: number; error?: string };
        refreshed_at?: string;
      }
  >(null);
  const [refLastFetched, setRefLastFetched] = useState<{ legalforms?: string; objecttypes?: string; customslas?: string }>({});

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }
      setCompanyId(profile.company_id);

      const { data, error } = await supabase.rpc("get_grenke_integration_status", {
        p_company_id: profile.company_id,
      });
      if (error) {
        console.error("[Grenke] status fetch failed:", error);
      } else if (data) {
        setStatus(data as IntegrationStatus);
      }

      // Load last-fetched timestamps for the 3 reference data kinds.
      const { data: refRows } = await supabase
        .from("grenke_reference_data")
        .select("kind, fetched_at")
        .eq("company_id", profile.company_id)
        .eq("environment", "production");
      if (refRows) {
        const map: { legalforms?: string; objecttypes?: string; customslas?: string } = {};
        for (const r of refRows as Array<{ kind: string; fetched_at: string }>) {
          if (r.kind === "legalforms" || r.kind === "objecttypes" || r.kind === "customslas") {
            map[r.kind] = r.fetched_at;
          }
        }
        setRefLastFetched(map);
      }
    } catch (e) {
      console.error("[Grenke] fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Phase 3a — Pull /legalforms /objecttypes /customslas from Grenke
  // into the local grenke_reference_data cache. Read-only on Grenke side,
  // safe to call any time.
  const handleRefreshReferenceData = async () => {
    try {
      setRefSyncing(true);
      setRefResult(null);

      const { data, error } = await supabase.functions.invoke("grenke-api", {
        body: { action: "refresh_reference_data", environment: "production" },
      });

      // Same context-reading trick as the other handlers for non-2xx bodies.
      let result: Record<string, unknown> | null = data as never;
      if (error) {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try { result = await ctx.json(); } catch { /* fall through */ }
        }
      }

      const r = result as {
        success?: boolean;
        results?: {
          legalforms: { ok: boolean; count: number; error?: string };
          objecttypes: { ok: boolean; count: number; error?: string };
          customslas: { ok: boolean; count: number; error?: string };
        };
        refreshed_at?: string;
        message?: string;
        error?: string;
      } | null;

      if (!r?.results) {
        toast.error(`Sync échouée : ${r?.message ?? r?.error ?? "réponse vide"}`);
        return;
      }

      setRefResult({
        success: !!r.success,
        legalforms: r.results.legalforms,
        objecttypes: r.results.objecttypes,
        customslas: r.results.customslas,
        refreshed_at: r.refreshed_at,
      });

      const total = r.results.legalforms.count + r.results.objecttypes.count + r.results.customslas.count;
      if (r.success) {
        toast.success(`Référentiels synchronisés (${total} entrées au total)`);
      } else {
        toast.warning("Synchronisation partielle — voir le détail dans la carte");
      }

      // Refresh timestamps from DB
      await fetchStatus();
    } catch (e) {
      console.error("[Grenke] refresh reference data error:", e);
      toast.error("Erreur inattendue pendant la sync");
    } finally {
      setRefSyncing(false);
    }
  };

  const validatePem = (cert: string, key: string): string | null => {
    if (!cert.trim()) return "Le certificat (PEM) est vide";
    if (!key.trim()) return "La clé privée (PEM) est vide";
    if (!cert.includes("-----BEGIN CERTIFICATE-----")) {
      return "Le certificat doit commencer par -----BEGIN CERTIFICATE-----";
    }
    if (!/-----BEGIN (RSA |EC |ENCRYPTED |)PRIVATE KEY-----/.test(key)) {
      return "La clé privée doit commencer par -----BEGIN (RSA )PRIVATE KEY-----";
    }
    return null;
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error("Company ID manquant");
      return;
    }
    const err = validatePem(certPem, keyPem);
    if (err) {
      toast.error(err);
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.rpc("set_grenke_credentials", {
        p_company_id: companyId,
        p_environment: activeTab,
        p_cert_pem: certPem.trim() + "\n",
        p_key_pem:  keyPem.trim()  + "\n",
      });
      if (error) {
        console.error("[Grenke] save failed:", error);
        toast.error(`Sauvegarde échouée : ${error.message}`);
        return;
      }
      toast.success(`Certificat ${ENV_LABELS[activeTab]} enregistré dans Vault`);
      // Wipe textareas — once saved, the cert lives in Vault and we never display it again.
      setCertPem("");
      setKeyPem("");
      await fetchStatus();
    } catch (e) {
      console.error("[Grenke] save error:", e);
      toast.error("Erreur inattendue lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (env: Environment) => {
    try {
      setTesting(env);
      const { data, error } = await supabase.functions.invoke("grenke-api", {
        body: { action: "echo", environment: env },
      });

      // When the edge function returns a non-2xx status, supabase-js sets
      // `error` to a FunctionsHttpError and `data` is null. The actual JSON
      // body (which contains our useful `error`/`message`/details fields)
      // is reachable via error.context (a Response). Read it so we can
      // surface the real failure cause instead of a generic
      // "non-2xx status code" message.
      let result: {
        success: boolean;
        status?: number;
        error?: string;
        message?: string;
        data?: unknown;
      } | null = data as never;

      if (error) {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            result = await ctx.json();
          } catch {
            /* body wasn't JSON — fall through to generic toast */
          }
        }
        if (!result) {
          toast.error(`Test ${ENV_LABELS[env]} échoué : ${error.message}`);
          return;
        }
      }

      if (!result) {
        toast.error(`Test ${ENV_LABELS[env]} échoué : réponse vide`);
        return;
      }
      if (result.success) {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Connexion {ENV_LABELS[env]} OK — Grenke a répondu</span>
          </div>,
          { duration: 5000 },
        );
      } else if (result.error === "credentials_missing") {
        toast.error(
          <div>
            <strong>Aucun certificat configuré pour {ENV_LABELS[env]}</strong>
            <p className="text-sm mt-1">
              Colle ton certificat signé dans l'onglet ci-dessous puis sauvegarde.
            </p>
          </div>,
          { duration: 8000 },
        );
      } else {
        toast.error(
          <div>
            <strong>Test {ENV_LABELS[env]} échoué</strong>
            <p className="text-sm mt-1">{result.message ?? result.error ?? "Erreur inconnue"}</p>
          </div>,
          { duration: 8000 },
        );
      }
    } catch (e) {
      console.error("[Grenke] test error:", e);
      toast.error("Erreur inattendue lors du test");
    } finally {
      setTesting(null);
    }
  };

  // Phase 2 — call POST /basic/v1/calculate via the edge function.
  // This is a smoke-test playground in the Settings card; the real wiring
  // into the offer-creation flow comes later.
  const handleCalculate = async () => {
    const amount = parseFloat(calcAmount);
    const period = parseInt(calcPeriod, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (!Number.isFinite(period) || period <= 0) {
      toast.error("Durée invalide");
      return;
    }

    try {
      setCalcRunning(true);
      setCalcResult(null);

      const { data, error } = await supabase.functions.invoke("grenke-api", {
        body: {
          action: "calculate",
          environment: calcEnv,
          payload: {
            FinancingAmount: amount,
            Period: period,
            ProductType: "ClassicLease",
            PaymentFrequency: "Monthly",
            Currency: "EUR",
          },
        },
      });

      // Read body from error.context when the function returned non-2xx
      // (same pattern as handleTestConnection).
      let result: Record<string, unknown> | null = data as never;
      if (error) {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try { result = await ctx.json(); } catch { /* fall through */ }
        }
      }

      const r = result as {
        success?: boolean;
        error?: string;
        message?: string;
        data?: { Items?: Array<{ Period: number; MonthlyTotalInstalment: number; FinancingAmount: number; Currency: string }> };
        grenke_response?: { Details?: string };
      } | null;

      if (r?.success && r.data?.Items) {
        setCalcResult({ success: true, items: r.data.Items });
        toast.success(`${r.data.Items.length} période(s) calculée(s)`);
        return;
      }

      // Special-case the "account not provisioned" 503 from our edge function.
      if (r?.error === "grenke_account_not_provisioned") {
        setCalcResult({ success: false, error: r.error, message: r.message });
        toast.error(
          <div>
            <strong>Compte Grenke pas encore activé</strong>
            <p className="text-sm mt-1">
              L'authentification fonctionne, mais Grenke n'a pas encore configuré
              la "condition list" (grille tarifs/produits) pour ce compte.
              Contactez votre représentant Grenke.
            </p>
          </div>,
          { duration: 12000 },
        );
        return;
      }

      setCalcResult({
        success: false,
        error: r?.error ?? "unknown",
        message: r?.message ?? r?.grenke_response?.Details ?? "Erreur inconnue",
      });
      toast.error(
        <div>
          <strong>Calcul échoué</strong>
          <p className="text-sm mt-1">{r?.message ?? r?.grenke_response?.Details ?? r?.error ?? "Erreur inconnue"}</p>
        </div>,
        { duration: 10000 },
      );
    } catch (e) {
      console.error("[Grenke] calculate error:", e);
      toast.error("Erreur inattendue pendant le calcul");
    } finally {
      setCalcRunning(false);
    }
  };

  const formatDate = (s?: string | null) => {
    if (!s) return "Jamais";
    return new Date(s).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Grenke
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const uatOk  = status?.environments?.uat ?? false;
  const prodOk = status?.environments?.production ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Grenke
                {prodOk ? (
                  <Badge className="bg-green-500/20 text-green-700 hover:bg-green-500/20">
                    <Wifi className="h-3 w-3 mr-1" /> Production
                  </Badge>
                ) : uatOk ? (
                  <Badge className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/20">
                    <Wifi className="h-3 w-3 mr-1" /> UAT
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" /> En attente d'accès productif
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Soumission des dossiers de financement directement à Grenke (BE / FR / LU)
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <a
              href="https://developer.grenkeonline.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Developer Portal Grenke"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* No-cert: explanatory alert with onboarding pointer */}
        {!uatOk && !prodOk && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm space-y-2">
              <p className="font-medium">Étapes pour activer l'intégration</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Demander à votre branche Grenke locale un <strong>accès
                  productif</strong> au Developer Portal (le compte par défaut
                  est en lecture seule).
                </li>
                <li>
                  Générer un CSR avec OpenSSL (commandes prêtes dans{" "}
                  <code>docs/grenke-api/certs/uat/</code>).
                </li>
                <li>
                  Uploader le CSR sur le portail Grenke, télécharger le
                  certificat signé, puis le coller ci-dessous.
                </li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {/* Per-environment status & test */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["uat", "production"] as Environment[]).map((env) => {
            const ok = env === "uat" ? uatOk : prodOk;
            const at = env === "uat" ? status?.uat_configured_at : status?.prod_configured_at;
            return (
              <div key={env} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{ENV_LABELS[env]}</span>
                  {ok ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ok ? `Configuré le ${formatDate(at)}` : "Non configuré"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={!ok || testing === env}
                  onClick={() => handleTestConnection(env)}
                >
                  {testing === env ? (
                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                  )}
                  Tester la connexion
                </Button>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Cert upload — environment-tabbed */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Environment)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="uat">UAT</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
          </TabsList>

          {(["uat", "production"] as Environment[]).map((env) => (
            <TabsContent key={env} value={env} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor={`grenke-cert-${env}`}>
                  Certificat signé par Grenke (PEM)
                </Label>
                <Textarea
                  id={`grenke-cert-${env}`}
                  rows={6}
                  placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                  value={activeTab === env ? certPem : ""}
                  onChange={(e) => setCertPem(e.target.value)}
                  className="font-mono text-xs"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                  Téléchargé depuis le portail Grenke (fichier <code>.cer</code> /
                  <code>.pem</code>) après upload de votre CSR.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`grenke-key-${env}`}>
                  Clé privée correspondante (PEM)
                </Label>
                <Textarea
                  id={`grenke-key-${env}`}
                  rows={6}
                  placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                  value={activeTab === env ? keyPem : ""}
                  onChange={(e) => setKeyPem(e.target.value)}
                  className="font-mono text-xs"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                  La clé que vous avez générée localement avec OpenSSL (
                  <code>leasingapi-{env}.key</code>). Elle est stockée chiffrée
                  dans Supabase Vault — nous ne la réaffichons jamais.
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saving || activeTab !== env}
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Sauvegarder le certificat {ENV_LABELS[env]}
              </Button>
            </TabsContent>
          ))}
        </Tabs>

        {/* Phase 2 — Calculator playground (only visible if at least one env is configured) */}
        {(uatOk || prodOk) && (
          <>
            <Separator />
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start gap-2">
                <Calculator className="h-4 w-4 mt-0.5 text-blue-600" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Calculateur Grenke (test)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Appelle <code className="text-[10px]">POST /basic/v1/calculate</code> via le proxy.
                    Sert à vérifier que ton compte Grenke a bien sa grille tarifaire activée.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="calc-amount" className="text-xs">Montant (€)</Label>
                  <Input
                    id="calc-amount"
                    type="number"
                    min="1"
                    step="1"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="calc-period" className="text-xs">Durée (mois)</Label>
                  <Input
                    id="calc-period"
                    type="number"
                    min="1"
                    max="120"
                    step="1"
                    value={calcPeriod}
                    onChange={(e) => setCalcPeriod(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="calc-env" className="text-xs">Environnement</Label>
                  <select
                    id="calc-env"
                    value={calcEnv}
                    onChange={(e) => setCalcEnv(e.target.value as Environment)}
                    className="h-8 w-full text-sm rounded-md border border-input bg-background px-2"
                  >
                    {uatOk && <option value="uat">UAT</option>}
                    {prodOk && <option value="production">Production</option>}
                  </select>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full"
                onClick={handleCalculate}
                disabled={calcRunning}
              >
                {calcRunning ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <Calculator className="h-3.5 w-3.5 mr-2" />
                )}
                Calculer via Grenke
              </Button>

              {calcResult && (
                <div className="text-xs space-y-1 pt-2 border-t border-border/50">
                  {calcResult.success && calcResult.items && (
                    <>
                      <div className="font-medium mb-1">
                        Résultat Grenke ({calcResult.items.length} période{calcResult.items.length > 1 ? "s" : ""})
                      </div>
                      <div className="rounded border bg-background">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="p-2 text-left font-medium">Durée</th>
                              <th className="p-2 text-right font-medium">Mensualité</th>
                              <th className="p-2 text-right font-medium">Coefficient*</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calcResult.items.map((it) => (
                              <tr key={it.Period} className="border-b last:border-0">
                                <td className="p-2">{it.Period} mois</td>
                                <td className="p-2 text-right tabular-nums">
                                  {new Intl.NumberFormat("fr-BE", { style: "currency", currency: it.Currency || "EUR" }).format(it.MonthlyTotalInstalment)}
                                </td>
                                <td className="p-2 text-right tabular-nums text-muted-foreground">
                                  {((it.MonthlyTotalInstalment / it.FinancingAmount) * 100).toFixed(3)} %
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic mt-1">
                        * Coefficient déduit = mensualité / montant × 100. Pour info — Grenke ne le renvoie pas directement.
                      </p>
                    </>
                  )}
                  {!calcResult.success && (
                    <div className="text-destructive">
                      <strong>Erreur :</strong> {calcResult.message ?? calcResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Phase 3a — Reference data sync */}
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start gap-2">
                <RefreshCw className="h-4 w-4 mt-0.5 text-blue-600" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Données de référence Grenke</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Synchronise les listes Grenke (formes juridiques, types d'objets,
                    SLA personnalisés) dans le cache local. À refaire ~1 fois par mois.
                    100% read-only côté Grenke, zéro risque.
                  </p>
                </div>
              </div>

              {/* Per-kind status table */}
              <div className="text-xs space-y-1">
                {(["legalforms", "objecttypes", "customslas"] as const).map((kind) => {
                  const lastFetched = refLastFetched[kind];
                  const fresh = refResult?.[kind];
                  return (
                    <div key={kind} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground capitalize">{kind === "legalforms" ? "Formes juridiques" : kind === "objecttypes" ? "Types d'objets" : "SLA personnalisés"} :</span>
                      <span className="tabular-nums">
                        {fresh ? (
                          fresh.ok ? (
                            <>✅ {fresh.count} entrée{fresh.count > 1 ? "s" : ""}</>
                          ) : (
                            <span className="text-destructive">❌ {fresh.error}</span>
                          )
                        ) : lastFetched ? (
                          <span className="text-muted-foreground">Dernière sync : {formatDate(lastFetched)}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Jamais synchronisé</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleRefreshReferenceData}
                disabled={refSyncing}
              >
                {refSyncing ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                )}
                Synchroniser les données de référence
              </Button>
            </div>

            {/* Phase 3a.2a — Field mappings editor (legal forms / categories / brands) */}
            {companyId && <GrenkeFieldMappings companyId={companyId} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}
