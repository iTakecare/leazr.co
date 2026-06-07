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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateModule, type SaasModule } from "@/services/saasModulesService";

interface Props {
  module: SaasModule;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Édition d'un module du catalogue Leazr (nom, description, prix add-on par
 * tier, statut core). Réservé au super_admin via RLS.
 */
const ModuleEditDialog: React.FC<Props> = ({ module, onClose, onSaved }) => {
  const [name, setName] = useState(module.name);
  const [description, setDescription] = useState(module.description);
  const [isCore, setIsCore] = useState(module.isCore);
  const [priceStarter, setPriceStarter] = useState(String(module.priceStarter));
  const [pricePro, setPricePro] = useState(String(module.pricePro));
  const [priceBusiness, setPriceBusiness] = useState(String(module.priceBusiness));
  const [saving, setSaving] = useState(false);

  const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    setSaving(true);
    try {
      const res = await updateModule(module.slug, {
        name: name.trim(),
        description: description.trim(),
        isCore,
        priceStarter: num(priceStarter),
        pricePro: num(pricePro),
        priceBusiness: num(priceBusiness),
      });
      if (res.success) {
        toast.success(`Module ${name} mis à jour.`);
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
          <DialogTitle>Module : {module.name}</DialogTitle>
          <DialogDescription>
            Les prix sont des add-ons mensuels (€) facturés quand le module est activé
            au-delà du socle inclus dans le plan. Un module « core » est inclus partout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mod-name">Nom</Label>
            <Input id="mod-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mod-desc">Description</Label>
            <Input id="mod-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mod-ps">Add-on Starter (€)</Label>
              <Input id="mod-ps" inputMode="decimal" value={priceStarter} onChange={(e) => setPriceStarter(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mod-pp">Add-on Pro (€)</Label>
              <Input id="mod-pp" inputMode="decimal" value={pricePro} onChange={(e) => setPricePro(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mod-pb">Add-on Business (€)</Label>
              <Input id="mod-pb" inputMode="decimal" value={priceBusiness} onChange={(e) => setPriceBusiness(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="mod-core" checked={isCore} onCheckedChange={setIsCore} />
            <Label htmlFor="mod-core">Module « core » (inclus dans tous les plans)</Label>
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

export default ModuleEditDialog;
