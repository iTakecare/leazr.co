import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import {
  setPlatformSecret,
  getPlatformSecretStatus,
} from "@/services/platformSecretsService";

/**
 * Paramètres de paiement SaaS : saisie de la clé API Mollie (Organisation).
 * La clé est stockée côté serveur (jamais relue par le navigateur) et utilisée
 * par les edge functions Mollie (abonnement SaaS + collecte SEPA).
 */
const PaymentSettings: React.FC = () => {
  const [mollieKey, setMollieKey] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    const status = await getPlatformSecretStatus(["MOLLIE_API_KEY"]);
    setConfigured(!!status.MOLLIE_API_KEY);
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = async () => {
    if (!mollieKey.trim()) {
      toast.error("Saisissez une clé API Mollie.");
      return;
    }
    setSaving(true);
    try {
      const res = await setPlatformSecret("MOLLIE_API_KEY", mollieKey.trim());
      if (res.success) {
        toast.success("Clé Mollie enregistrée.");
        setMollieKey("");
        await loadStatus();
      } else {
        toast.error(res.error || "Échec de l'enregistrement.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle>Mollie</CardTitle>
          {!loading && configured !== null && (
            configured ? (
              <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3" /> Configurée
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                <AlertCircle className="h-3 w-3" /> Non configurée
              </Badge>
            )
          )}
        </div>
        <CardDescription>
          Clé API Mollie (Organisation) utilisée pour les abonnements SaaS et la
          collecte SEPA. La clé est stockée de façon sécurisée côté serveur et
          n'est jamais réaffichée.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5 max-w-xl">
          <Label htmlFor="mollie-key">
            {configured ? "Remplacer la clé API Mollie" : "Clé API Mollie"}
          </Label>
          <Input
            id="mollie-key"
            type="password"
            autoComplete="off"
            value={mollieKey}
            onChange={(e) => setMollieKey(e.target.value)}
            placeholder="live_xxxxxxxx ou test_xxxxxxxx"
          />
          <p className="text-xs text-muted-foreground">
            Clé « Live » pour la production, « Test » pour le sandbox Mollie.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {configured ? "Mettre à jour la clé" : "Enregistrer la clé"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentSettings;
