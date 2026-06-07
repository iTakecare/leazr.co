import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import { type SaasPlanId } from "@/config/saasPlans";
import { useSaasPlans } from "@/hooks/useSaasPlans";
import { useModulesCatalog } from "@/hooks/useModulesCatalog";
import { computeMonthlyPrice } from "@/services/saasModulesService";
import {
  subscribeToPlan,
  fetchCompanyModulesEnabled,
} from "@/services/saasSubscriptionService";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

/**
 * Page d'abonnement côté ENTREPRISE cliente : choix du plan + mandat SEPA (IBAN)
 * → souscription Mollie récurrente. Réactive le compte en fin d'essai.
 * Affiche le détail tarifaire hybride : base du plan + add-ons modules.
 */
const SubscriptionSettings: React.FC = () => {
  const { status, plan: currentPlan } = useSubscriptionStatus();
  const { plans } = useSaasPlans();
  const { catalog, planModules } = useModulesCatalog();
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [selected, setSelected] = useState<SaasPlanId>("pro");
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId || cancelled) return;
      const mods = await fetchCompanyModulesEnabled(companyId);
      if (!cancelled) setEnabledModules(mods);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPlan = plans.find((p) => p.id === selected);

  // Détail tarifaire hybride pour le plan sélectionné.
  const pricing = useMemo(() => {
    if (!selectedPlan) return { total: 0, addOns: [] as { slug: string; name: string; price: number }[] };
    return computeMonthlyPrice({
      planId: selected,
      planBasePrice: selectedPlan.price,
      includedSlugs: planModules[selected] ?? [],
      enabledSlugs: enabledModules,
      catalog,
    });
  }, [selectedPlan, selected, planModules, enabledModules, catalog]);

  const handleSubscribe = async () => {
    if (!accountHolder.trim() || !iban.trim()) {
      toast.error("Titulaire et IBAN sont requis.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await subscribeToPlan({
        plan: selected,
        iban: iban.trim(),
        accountHolder: accountHolder.trim(),
        bic: bic.trim() || undefined,
      });
      if (res.success) {
        toast.success("Abonnement créé. Votre compte est réactivé.");
      } else {
        toast.error(res.error || "Échec de la souscription.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="py-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Abonnement</h1>
          <p className="text-muted-foreground">
            Choisissez votre plan et activez le prélèvement SEPA.
            {status && (
              <>
                {" "}Statut actuel : <Badge variant="outline">{status}</Badge>
                {currentPlan ? ` · plan ${currentPlan}` : ""}
              </>
            )}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const isSelected = selected === p.id;
            return (
              <Card
                key={p.id}
                role="button"
                onClick={() => setSelected(p.id)}
                className={`cursor-pointer transition ${isSelected ? "ring-2 ring-primary" : "hover:border-primary/50"}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{p.name}</CardTitle>
                    {p.popular && (
                      <Badge className="gap-1">
                        <Star className="h-3 w-3" /> Populaire
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{p.description}</CardDescription>
                  <div className="text-2xl font-bold">
                    {p.price} € <span className="text-sm font-normal text-muted-foreground">/ mois</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mandat de prélèvement SEPA</CardTitle>
            <CardDescription>
              Le montant du plan {plans.find((p) => p.id === selected)?.name} sera prélevé
              chaque mois via Mollie.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="holder">Titulaire du compte</Label>
                <Input
                  id="holder"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Nom du titulaire"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bic">BIC (optionnel)</Label>
                <Input id="bic" value={bic} onChange={(e) => setBic(e.target.value)} placeholder="GEBABEBB" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="BE00 0000 0000 0000"
              />
            </div>

            {/* Détail tarifaire hybride : base du plan + add-ons modules */}
            <div className="rounded-md border p-3 text-sm space-y-1.5 bg-muted/40">
              <div className="flex justify-between">
                <span>Plan {selectedPlan?.name}</span>
                <span>{selectedPlan?.price ?? 0} €</span>
              </div>
              {pricing.addOns.map((a) => (
                <div key={a.slug} className="flex justify-between text-muted-foreground">
                  <span>+ {a.name} (add-on)</span>
                  <span>{a.price} €</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t pt-1.5 mt-1.5">
                <span>Total mensuel</span>
                <span>{pricing.total} € / mois</span>
              </div>
            </div>

            <Button onClick={handleSubscribe} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              S'abonner — {pricing.total} € / mois
            </Button>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export default SubscriptionSettings;
