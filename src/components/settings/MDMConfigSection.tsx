import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Wifi, WifiOff, Loader2, ExternalLink } from "lucide-react";

const MDM_TYPES = [
  { value: "fleet", label: "Fleet (Osquery)", url: "https://fleetdm.com" },
  { value: "tactical_rmm", label: "Tactical RMM", url: "https://tacticalrmm.com" },
  { value: "meshcentral", label: "MeshCentral", url: "https://meshcentral.com" },
  { value: "other", label: "Autre" },
];

const MDMConfigSection: React.FC = () => {
  const { companyId } = useMultiTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["mdm-config", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mdm_configurations")
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const [form, setForm] = useState({
    mdm_type: config?.mdm_type || "fleet",
    api_url: config?.api_url || "",
  });

  React.useEffect(() => {
    if (config) {
      setForm({ mdm_type: config.mdm_type, api_url: config.api_url || "" });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (config) {
        const { error } = await supabase
          .from("mdm_configurations")
          .update({ mdm_type: form.mdm_type, api_url: form.api_url, updated_at: new Date().toISOString() })
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mdm_configurations")
          .insert({ company_id: companyId, mdm_type: form.mdm_type, api_url: form.api_url });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mdm-config"] });
      toast({ title: "Configuration MDM sauvegardée" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const testConnection = async () => {
    setTesting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/mdm-deploy-software`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "test_connection", company_id: companyId }),
      });

      const data = await response.json();
      if (data.connected) {
        toast({ title: "Connexion réussie", description: "Le MDM est accessible" });
        await supabase
          .from("mdm_configurations")
          .update({ is_connected: true, last_tested_at: new Date().toISOString() })
          .eq("company_id", companyId);
        queryClient.invalidateQueries({ queryKey: ["mdm-config"] });
      } else {
        toast({ title: "Connexion échouée", description: data.error || "Impossible de se connecter au MDM", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur de test", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const selectedMdm = MDM_TYPES.find((m) => m.value === form.mdm_type);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Configuration MDM
        </CardTitle>
        <CardDescription>
          Connectez votre solution MDM (Mobile Device Management) pour déployer des logiciels à distance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {config?.is_connected ? (
          <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Wifi className="h-3 w-3" /> Connecté
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <WifiOff className="h-3 w-3" /> Non connecté
          </Badge>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type de MDM</Label>
            <Select value={form.mdm_type} onValueChange={(v) => setForm({ ...form, mdm_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MDM_TYPES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedMdm?.url && (
              <a href={selectedMdm.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                <ExternalLink className="h-3 w-3" /> Site officiel de {selectedMdm.label}
              </a>
            )}
          </div>

          <div className="space-y-2">
            <Label>URL de l'API MDM</Label>
            <Input
              value={form.api_url}
              onChange={(e) => setForm({ ...form, api_url: e.target.value })}
              placeholder="https://fleet.votre-serveur.com/api"
            />
            <p className="text-xs text-muted-foreground">
              Le token API doit être configuré comme secret dans les edge functions (MDM_API_TOKEN)
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
          <Button variant="outline" onClick={testConnection} disabled={testing || !form.api_url} className="gap-1">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            Tester la connexion
          </Button>
        </div>

        {config?.last_tested_at && (
          <p className="text-xs text-muted-foreground">
            Dernier test : {new Date(config.last_tested_at).toLocaleString("fr-FR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MDMConfigSection;
