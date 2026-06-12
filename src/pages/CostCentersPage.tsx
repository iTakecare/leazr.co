import React, { useEffect, useState } from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Plus, Globe, Shield } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { toast } from "sonner";
import {
  CostCenter, SharingPolicy,
  getCostCenters, createCostCenter, getSharingPolicies, updateSharingPolicy,
} from "@/services/costCenterService";

const COUNTRIES = [
  { code: "BE", name: "Belgique" }, { code: "FR", name: "France" },
  { code: "LU", name: "Luxembourg" }, { code: "NL", name: "Pays-Bas" },
  { code: "DE", name: "Allemagne" }, { code: "ES", name: "Espagne" },
  { code: "IT", name: "Italie" }, { code: "PT", name: "Portugal" },
];

const POLICY_FIELDS: Array<{ key: keyof SharingPolicy; label: string; help: string }> = [
  { key: "share_financial_aggregates", label: "Agrégats financiers", help: "Totaux CA / dépenses / marge remontés à la centrale" },
  { key: "share_invoice_detail", label: "Détail des factures", help: "Lignes de factures (vente & achat) — attention RGPD" },
  { key: "share_client_data", label: "Données clients", help: "Clients nominatifs — souvent restreint selon le pays" },
  { key: "share_hr_data", label: "Données RH / salaires", help: "Postes RH — généralement local au comptoir" },
  { key: "share_accounting", label: "Comptabilité", help: "Soldes comptables (Yuki) agrégés" },
];

const CostCentersPage: React.FC = () => {
  const { companyId } = useMultiTenant();
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [policies, setPolicies] = useState<Record<string, SharingPolicy>>({});
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", country: "FR", currency: "EUR" });

  const load = async () => {
    if (!companyId) return;
    const [cs, ps] = await Promise.all([getCostCenters(companyId), getSharingPolicies(companyId)]);
    setCenters(cs);
    setPolicies(Object.fromEntries(ps.map((p) => [p.cost_center_id, p])));
  };
  useEffect(() => { load(); }, [companyId]);

  const handleCreate = async () => {
    if (!companyId || !form.name) { toast.error("Nom requis"); return; }
    setCreating(true);
    try {
      await createCostCenter(companyId, form);
      toast.success(`Comptoir « ${form.name} » créé`);
      setForm({ name: "", code: "", country: "FR", currency: "EUR" });
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const togglePolicy = async (center: CostCenter, key: keyof SharingPolicy, value: boolean) => {
    if (!companyId) return;
    const current = policies[center.id] || {
      cost_center_id: center.id, share_financial_aggregates: true, share_invoice_detail: false,
      share_client_data: false, share_hr_data: false, share_accounting: true, notes: null,
    };
    const next = { ...current, [key]: value } as SharingPolicy;
    setPolicies((p) => ({ ...p, [center.id]: next }));
    try {
      await updateSharingPolicy(companyId, next);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
      await load();
    }
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-6 space-y-6 max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Comptoirs iTakecare</h1>
              <p className="text-muted-foreground text-sm">Vos centres / comptoirs et ce que chacun remonte à la centrale</p>
            </div>
          </div>

          {/* Créer un comptoir */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Nouveau comptoir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2">
                  <Label className="text-xs">Nom *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="iTakecare France — Paris" />
                </div>
                <div>
                  <Label className="text-xs">Code</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="FR-PAR" />
                </div>
                <div>
                  <Label className="text-xs">Pays</Label>
                  <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (<SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={creating || !form.name} className="mt-3 gap-2">
                <Plus className="h-4 w-4" /> {creating ? "Création..." : "Créer le comptoir"}
              </Button>
            </CardContent>
          </Card>

          {/* Liste + politiques */}
          {centers.map((c) => {
            const pol = policies[c.id];
            return (
              <Card key={c.id} className={c.is_headquarters ? "border-l-4 border-l-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {c.is_headquarters ? <Globe className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4" />}
                      {c.name}
                      {c.is_headquarters && <Badge>Centrale</Badge>}
                      <Badge variant="outline">{c.country}</Badge>
                    </CardTitle>
                  </div>
                  {!c.is_headquarters && (
                    <CardDescription className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Données remontées vers la centrale (selon les lois locales)
                    </CardDescription>
                  )}
                </CardHeader>
                {!c.is_headquarters && (
                  <CardContent className="space-y-3">
                    {POLICY_FIELDS.map((f) => (
                      <div key={f.key} className="flex items-center justify-between gap-4 py-1 border-b last:border-0">
                        <div>
                          <div className="text-sm font-medium">{f.label}</div>
                          <div className="text-xs text-muted-foreground">{f.help}</div>
                        </div>
                        <Switch
                          checked={!!(pol ? pol[f.key] : (f.key === "share_financial_aggregates" || f.key === "share_accounting"))}
                          onCheckedChange={(v) => togglePolicy(c, f.key, v)}
                        />
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}

          <Alert>
            <AlertDescription className="text-xs">
              Chaque comptoir alimente Leazr (contrats, factures, achats, clients) avec sa propre dimension.
              La <strong>Vue consolidée</strong> (page Gestion) additionne tous les comptoirs ; la <strong>vue par comptoir</strong> isole un centre.
              Les interrupteurs ci-dessus déterminent ce qu'un comptoir remonte à la centrale — à régler selon la législation de chaque pays (RGPD, résidence des données).
              Une administration Yuki distincte par pays peut être branchée par comptoir.
            </AlertDescription>
          </Alert>
        </div>
      </Container>
    </PageTransition>
  );
};

export default CostCentersPage;
