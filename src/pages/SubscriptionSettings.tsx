import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import { SAAS_PLANS_LIST, type SaasPlanId } from "@/config/saasPlans";
import { subscribeToPlan } from "@/services/saasSubscriptionService";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

/**
 * Page d'abonnement côté ENTREPRISE cliente : choix du plan + mandat SEPA (IBAN)
 * → souscription Mollie récurrente. Réactive le compte en fin d'essai.
 */
const SubscriptionSettings: React.FC = () => {
  const { status, plan: currentPlan } = useSubscriptionStatus();
  const [selected, setSelected] = useState<SaasPlanId>("pro");
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          {SAAS_PLANS_LIST.map((p) => {
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
              Le montant du plan {SAAS_PLANS_LIST.find((p) => p.id === selected)?.name} sera prélevé
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
            <Button onClick={handleSubscribe} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              S'abonner au plan {SAAS_PLANS_LIST.find((p) => p.id === selected)?.name}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export default SubscriptionSettings;
