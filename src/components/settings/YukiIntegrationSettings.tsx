import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Key, TestTube, CheckCircle, XCircle, BookOpen } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { toast } from "sonner";
import {
  testYuki, saveYukiIntegration, getYukiIntegration, YukiAdministration,
} from "@/services/cfoService";

const YukiIntegrationSettings: React.FC = () => {
  const { companyId } = useMultiTenant();
  const [accessKey, setAccessKey] = useState("");
  const [administrationId, setAdministrationId] = useState("");
  const [administrations, setAdministrations] = useState<YukiAdministration[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    getYukiIntegration(companyId).then((data) => {
      if (data) {
        setEnabled(!!data.is_enabled);
        setAccessKey(data.api_credentials?.accessKey || "");
        setAdministrationId(data.api_credentials?.administrationId || "");
      }
    });
  }, [companyId]);

  const handleTest = async () => {
    if (!companyId || !accessKey) {
      toast.error("Renseigne d'abord la clé API Yuki");
      return;
    }
    setTesting(true);
    try {
      const admins = await testYuki(companyId, accessKey);
      setAdministrations(admins);
      if (admins.length === 1) setAdministrationId(admins[0].id);
      toast.success(`Connexion Yuki OK — ${admins.length} administration(s) trouvée(s)`);
    } catch (e: any) {
      toast.error(e.message || "Test Yuki échoué");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!companyId || !accessKey || !administrationId) {
      toast.error("Clé API et administration requises");
      return;
    }
    setSaving(true);
    try {
      await saveYukiIntegration(companyId, accessKey, administrationId);
      setEnabled(true);
      toast.success("Intégration Yuki activée (lecture seule)");
    } catch (e: any) {
      toast.error(e.message || "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Yuki — comptabilité (lecture seule)
          </CardTitle>
          <CardDescription>
            Leazr lit le grand livre, le P&L et les soldes depuis Yuki pour alimenter le pilotage (Gestion / CFO IA).
            Rien n'est écrit dans Yuki — Billit continue d'alimenter la comptabilité comme aujourd'hui.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            {enabled ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
            <span className="font-medium">{enabled ? "Activée" : "Non configurée"}</span>
            {enabled && <Badge variant="default" className="ml-1">Lecture seule</Badge>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="yuki-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" /> Clé API Yuki (Webservice Access Key) *
            </Label>
            <Input
              id="yuki-key"
              type="password"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="Clé générée dans Yuki → Paramètres → Webservices"
            />
            <p className="text-xs text-muted-foreground">
              Dans Yuki : roue dentée → Paramètres du domaine → Webservices → nouvelle clé API.
            </p>
          </div>

          {administrations.length > 0 ? (
            <div className="space-y-2">
              <Label>Administration *</Label>
              <Select value={administrationId} onValueChange={setAdministrationId}>
                <SelectTrigger><SelectValue placeholder="Choisir l'administration" /></SelectTrigger>
                <SelectContent>
                  {administrations.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            administrationId && (
              <div className="space-y-2">
                <Label htmlFor="yuki-admin">Administration ID</Label>
                <Input id="yuki-admin" value={administrationId} onChange={(e) => setAdministrationId(e.target.value)} />
              </div>
            )
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" onClick={handleTest} disabled={testing || !accessKey} className="gap-2">
              <TestTube className="h-4 w-4" />
              {testing ? "Test..." : "Tester la connexion"}
            </Button>
            <Button onClick={handleSave} disabled={saving || !accessKey || !administrationId}>
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              Après activation, la vue comptable apparaît dans <strong>Gestion → Comptabilité</strong> et
              le <strong>CFO IA</strong> intègre automatiquement les chiffres Yuki (trésorerie, charges réelles,
              salaires, amortissements) dans ses rapports et réponses.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default YukiIntegrationSettings;
