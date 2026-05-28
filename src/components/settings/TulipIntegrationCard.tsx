// Tulip insurance API integration card.
//
//   - Read current integration status (sandbox / production key configured?)
//   - Paste an API key per environment, persisted via set_tulip_credentials RPC
//     (which stores the key in Supabase Vault, never in JSONB).
//   - "Test connection" calls the tulip-api edge function with action=echo,
//     which does a real authenticated GET /products against the Tulip API.
//
// Insurance actions (quote, subscribe, get_contract, cancel_contract) are
// exposed by the tulip-api edge function and called from the contract flow.

import React, { useEffect, useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Umbrella,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Environment = "sandbox" | "production";

interface IntegrationStatus {
  configured: boolean;
  is_enabled: boolean;
  updated_at?: string;
  environments: { sandbox: boolean; production: boolean };
  sandbox_configured_at?: string | null;
  prod_configured_at?: string | null;
}

const ENV_LABELS: Record<Environment, string> = {
  sandbox: "Test (Sandbox)",
  production: "Production",
};

export default function TulipIntegrationCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<Environment | null>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  const [activeTab, setActiveTab] = useState<Environment>("sandbox");
  const [apiKey, setApiKey] = useState("");

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

      const { data, error } = await supabase.rpc("get_tulip_integration_status", {
        p_company_id: profile.company_id,
      });
      if (error) {
        console.error("[Tulip] status fetch failed:", error);
      } else if (data) {
        setStatus(data as IntegrationStatus);
      }
    } catch (e) {
      console.error("[Tulip] fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error("Company ID manquant");
      return;
    }
    if (!apiKey.trim()) {
      toast.error("La clé API est vide");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.rpc("set_tulip_credentials", {
        p_company_id: companyId,
        p_environment: activeTab,
        p_api_key: apiKey.trim(),
      });
      if (error) {
        console.error("[Tulip] save failed:", error);
        toast.error(`Sauvegarde échouée : ${error.message}`);
        return;
      }
      toast.success(`Clé API ${ENV_LABELS[activeTab]} enregistrée dans Vault`);
      // Wipe input — once saved, the key lives in Vault and we never display it again.
      setApiKey("");
      await fetchStatus();
    } catch (e) {
      console.error("[Tulip] save error:", e);
      toast.error("Erreur inattendue lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (env: Environment) => {
    try {
      setTesting(env);
      const { data, error } = await supabase.functions.invoke("tulip-api", {
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
            <span>Connexion {ENV_LABELS[env]} OK — Tulip a répondu</span>
          </div>,
          { duration: 5000 },
        );
      } else if (result.error === "credentials_missing") {
        toast.error(
          <div>
            <strong>Aucune clé API configurée pour {ENV_LABELS[env]}</strong>
            <p className="text-sm mt-1">
              Colle ta clé API Tulip dans l'onglet ci-dessous puis sauvegarde.
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
      console.error("[Tulip] test error:", e);
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
            <Umbrella className="h-5 w-5" /> Tulip
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

  const sandboxOk = status?.environments?.sandbox ?? false;
  const prodOk = status?.environments?.production ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Umbrella className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Tulip
                {prodOk ? (
                  <Badge className="bg-green-500/20 text-green-700 hover:bg-green-500/20">
                    <Wifi className="h-3 w-3 mr-1" /> Production
                  </Badge>
                ) : sandboxOk ? (
                  <Badge className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/20">
                    <Wifi className="h-3 w-3 mr-1" /> Sandbox
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" /> Non configurée
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Assurance du matériel directement via l'API Tulip
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Info notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm space-y-1">
            <p className="font-medium">Comment ça marche</p>
            <p>
              Enregistre ta clé API Tulip par environnement (stockée chiffrée
              dans Vault). La clé de test crée des contrats d'essai, la clé de
              production des contrats réels. L'assurance du matériel est
              souscrite via l'API Tulip une fois l'offre devenue un contrat.
            </p>
          </AlertDescription>
        </Alert>

        {/* Per-environment status & test */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["sandbox", "production"] as Environment[]).map((env) => {
            const ok = env === "sandbox" ? sandboxOk : prodOk;
            const at = env === "sandbox" ? status?.sandbox_configured_at : status?.prod_configured_at;
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

        {/* API key — environment-tabbed */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Environment)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
          </TabsList>

          {(["sandbox", "production"] as Environment[]).map((env) => (
            <TabsContent key={env} value={env} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor={`tulip-key-${env}`}>
                  Clé API Tulip ({ENV_LABELS[env]})
                </Label>
                <Input
                  id={`tulip-key-${env}`}
                  type="password"
                  placeholder="sk_..."
                  value={activeTab === env ? apiKey : ""}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono text-xs"
                  spellCheck={false}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  La clé est stockée chiffrée dans Supabase Vault — nous ne la
                  réaffichons jamais.
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
                Sauvegarder la clé {ENV_LABELS[env]}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
