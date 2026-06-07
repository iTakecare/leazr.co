import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { SaasPlan } from "@/config/saasPlans";
import { updateSaasPlan } from "@/services/saasPlansService";

interface Props {
  plan: SaasPlan;
  onClose: () => void;
  onSaved: () => void;
}

/** Édition d'un plan tarifaire SaaS (réservé au super_admin via RLS). */
const SaasPlanEditDialog: React.FC<Props> = ({ plan, onClose, onSaved }) => {
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(String(plan.price)); // euros, saisie admin
  const [description, setDescription] = useState(plan.description);
  const [features, setFeatures] = useState(plan.features.join("\n"));
  const [maxUsers, setMaxUsers] = useState(String(plan.maxUsers));
  const [maxModules, setMaxModules] = useState(String(plan.maxModules));
  const [popular, setPopular] = useState(plan.popular);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const priceEuros = Number(price.replace(",", "."));
    if (!name.trim() || Number.isNaN(priceEuros) || priceEuros < 0) {
      toast.error("Nom et prix valides requis.");
      return;
    }
    setSaving(true);
    try {
      const res = await updateSaasPlan(plan.id, {
        name: name.trim(),
        priceCents: Math.round(priceEuros * 100),
        description: description.trim(),
        features: features.split("\n").map((f) => f.trim()).filter(Boolean),
        maxUsers: parseInt(maxUsers, 10) || -1,
        maxModules: parseInt(maxModules, 10) || -1,
        popular,
        isActive: true,
      });
      if (res.success) {
        toast.success(`Plan ${name} mis à jour.`);
        onSaved();
      } else {
        toast.error(res.error || "Échec de la mise à jour.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le plan {plan.name}</DialogTitle>
          <DialogDescription>
            La nouvelle grille s'applique immédiatement aux écrans d'abonnement et
            au montant prélevé par Mollie pour les futures souscriptions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Nom</Label>
              <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-price">Prix (€/mois)</Label>
              <Input id="plan-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-desc">Description</Label>
            <Input id="plan-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="plan-users">Max utilisateurs (-1 = illimité)</Label>
              <Input id="plan-users" inputMode="numeric" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-modules">Max modules (-1 = illimité)</Label>
              <Input id="plan-modules" inputMode="numeric" value={maxModules} onChange={(e) => setMaxModules(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-features">Fonctionnalités (une par ligne)</Label>
            <Textarea id="plan-features" rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <Switch id="plan-popular" checked={popular} onCheckedChange={setPopular} />
            <Label htmlFor="plan-popular">Marquer comme « Populaire »</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaasPlanEditDialog;
