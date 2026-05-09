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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    } catch (e) {
      console.error("[Grenke] fetch error:", e);
    } finally {
      setLoading(false);
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
      if (error) {
        toast.error(`Test ${ENV_LABELS[env]} échoué : ${error.message}`);
        return;
      }
      const result = data as {
        success: boolean;
        status?: number;
        error?: string;
        message?: string;
        data?: unknown;
      };
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
      </CardContent>
    </Card>
  );
}
