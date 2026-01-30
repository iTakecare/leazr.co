import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  RefreshCw,
  Unlink,
  Wifi,
  WifiOff,
  Activity,
  Settings2
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Environment = "sandbox" | "live";
type VerificationStatus = "successful" | "pending" | "action_required" | "unknown";
type ConnectionStatus = "active" | "pending" | "revoked" | "error";

interface ConnectionData {
  connected: boolean;
  status?: ConnectionStatus;
  environment?: Environment;
  organisationId?: string;
  connectedAt?: string;
  verificationStatus?: VerificationStatus;
  verificationCheckedAt?: string;
  verificationUrl?: string;
}

interface DiagnosticsData {
  lastWebhookReceived?: string;
  lastPaymentStatusChange?: string;
  webhookEndpoint: string;
}

export default function GoCardlessIntegrationCard() {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  
  const [connection, setConnection] = useState<ConnectionData | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>("sandbox");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData>({
    webhookEndpoint: "https://cifbetjefyfocafanlhv.supabase.co/functions/v1/gocardless-webhook"
  });

  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setConnection({ connected: false });
        return;
      }

      const response = await supabase.functions.invoke("gocardless-verification-status", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) {
        console.error("Error fetching GoCardless status:", response.error);
        setConnection({ connected: false });
        return;
      }

      setConnection(response.data);
      
      // Fetch diagnostics data
      if (response.data?.connected) {
        await fetchDiagnostics();
      }
    } catch (error) {
      console.error("Error:", error);
      setConnection({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const fetchDiagnostics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.company_id) return;

      // Get last webhook event
      const { data: lastEvent } = await supabase
        .from("gocardless_webhook_events")
        .select("received_at, action, resource_type")
        .eq("company_id", profile.company_id)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get last payment status change
      const { data: lastPayment } = await supabase
        .from("gocardless_webhook_events")
        .select("received_at")
        .eq("company_id", profile.company_id)
        .eq("resource_type", "payments")
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setDiagnostics(prev => ({
        ...prev,
        lastWebhookReceived: lastEvent?.received_at,
        lastPaymentStatusChange: lastPayment?.received_at
      }));
    } catch (error) {
      console.error("Error fetching diagnostics:", error);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vous devez être connecté");
        return;
      }

      const response = await supabase.functions.invoke("gocardless-oauth-start", {
        body: { environment: selectedEnvironment },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) {
        toast.error("Erreur lors de l'initialisation de la connexion");
        return;
      }

      if (response.data?.authorizeUrl) {
        // Redirect to GoCardless OAuth
        window.location.href = response.data.authorizeUrl;
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de la connexion");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Êtes-vous sûr de vouloir déconnecter GoCardless ? Les mandats existants ne seront pas affectés.")) {
      return;
    }

    try {
      setDisconnecting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vous devez être connecté");
        return;
      }

      const response = await supabase.functions.invoke("gocardless-disconnect", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) {
        toast.error("Erreur lors de la déconnexion");
        return;
      }

      toast.success("GoCardless déconnecté");
      setConnection({ connected: false });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    await fetchConnectionStatus();
    setRefreshing(false);
    toast.success("Statut mis à jour");
  };

  const handleReconcile = async () => {
    try {
      setReconciling(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vous devez être connecté");
        return;
      }

      const response = await supabase.functions.invoke("gocardless-reconcile", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) {
        toast.error("Erreur lors de la réconciliation");
        return;
      }

      toast.success(response.data?.message || "Réconciliation terminée");
      await fetchConnectionStatus();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de la réconciliation");
    } finally {
      setReconciling(false);
    }
  };

  const getVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case "successful":
        return (
          <Badge className="bg-primary/20 text-primary hover:bg-primary/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Vérifié
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case "action_required":
        return (
          <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Action requise
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Inconnu
          </Badge>
        );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            GoCardless
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                GoCardless
                {connection?.connected && (
                  <Badge variant={connection.environment === "live" ? "default" : "secondary"}>
                    {connection.environment === "live" ? "Production" : "Sandbox"}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Prélèvements SEPA automatisés pour vos contrats
              </CardDescription>
            </div>
          </div>
          {connection?.connected && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefreshStatus}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {connection?.connected ? (
          <>
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              <Wifi className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Connecté en tant que</span>
              <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                {connection.organisationId}
              </code>
            </div>

            {/* Verification Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Statut de vérification:</span>
                {getVerificationBadge(connection.verificationStatus || "unknown")}
              </div>
              {connection.verificationCheckedAt && (
                <span className="text-xs text-muted-foreground">
                  Vérifié le {formatDate(connection.verificationCheckedAt)}
                </span>
              )}
            </div>

            {/* Action Required Alert */}
            {connection.verificationStatus === "action_required" && connection.verificationUrl && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Vous devez compléter la vérification de votre compte GoCardless.</span>
                  <Button variant="link" size="sm" asChild>
                    <a href={connection.verificationUrl} target="_blank" rel="noopener noreferrer">
                      Compléter <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Diagnostics Panel */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
              >
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Diagnostics
                </span>
                <Settings2 className={`h-4 w-4 transition-transform ${showDiagnostics ? "rotate-90" : ""}`} />
              </Button>

              {showDiagnostics && (
                <div className="mt-3 space-y-3 p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Endpoint webhook:</span>
                    <code className="text-xs bg-background px-1.5 py-0.5 rounded max-w-[200px] truncate">
                      {diagnostics.webhookEndpoint}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dernier webhook reçu:</span>
                    <span>{formatDate(diagnostics.lastWebhookReceived)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dernier statut paiement:</span>
                    <span>{formatDate(diagnostics.lastPaymentStatusChange)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Connexion établie le:</span>
                    <span>{formatDate(connection.connectedAt)}</span>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={handleReconcile}
                    disabled={reconciling}
                  >
                    {reconciling ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Réconcilier les données
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Disconnect Button */}
            <Button 
              variant="outline" 
              className="w-full text-destructive hover:text-destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4 mr-2" />
              )}
              Déconnecter GoCardless
            </Button>
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <WifiOff className="h-4 w-4" />
              Non connecté
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connectez votre compte GoCardless pour activer les prélèvements SEPA automatiques sur vos contrats.
              </p>

              <RadioGroup
                value={selectedEnvironment}
                onValueChange={(value) => setSelectedEnvironment(value as Environment)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sandbox" id="sandbox" />
                  <Label htmlFor="sandbox" className="cursor-pointer">
                    Sandbox (test)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="live" id="live" />
                  <Label htmlFor="live" className="cursor-pointer">
                    Production
                  </Label>
                </div>
              </RadioGroup>

              {selectedEnvironment === "live" && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    En mode production, les prélèvements seront réels. Assurez-vous que votre compte GoCardless est vérifié.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Button 
              className="w-full" 
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Connecter GoCardless
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
