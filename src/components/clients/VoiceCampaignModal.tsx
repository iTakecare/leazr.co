import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";

interface SelectedOffer {
  offer_id: string;
  label: string;
}

interface VoiceCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: SelectedOffer[];
  /** Appelé après un lancement réussi (pour vider la sélection). */
  onLaunched?: () => void;
}

interface Skipped { offer_id: string; name: string; reason: string }

const VoiceCampaignModal: React.FC<VoiceCampaignModalProps> = ({ open, onOpenChange, offers, onLaunched }) => {
  const { navigateToAdmin } = useRoleNavigation();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<"fr" | "nl" | "en">("fr");
  const [submitting, setSubmitting] = useState(false);

  const launch = async () => {
    if (!name.trim()) { toast.error("Donnez un nom à la campagne"); return; }
    if (offers.length === 0) { toast.error("Aucune demande sélectionnée"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-campaign-start", {
        body: { offer_ids: offers.map((o) => o.offer_id), name: name.trim(), language },
      });
      if (error) {
        let serverMsg = "";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            serverMsg = body?.error ?? "";
          }
        } catch { /* */ }
        throw new Error(serverMsg || (error as Error).message);
      }

      const queued = (data as { queued?: number })?.queued ?? 0;
      const skipped = ((data as { skipped?: Skipped[] })?.skipped ?? []);
      toast.success(`Campagne lancée : Alex va rappeler ${queued} client(s), un par un.`);
      if (skipped.length > 0) {
        toast.warning(
          `${skipped.length} demande(s) ignorée(s) : ${skipped.slice(0, 3).map((s) => `${s.name} (${s.reason})`).join(", ")}${skipped.length > 3 ? "…" : ""}`,
          { duration: 8000 },
        );
      }
      onOpenChange(false);
      setName("");
      onLaunched?.();
      navigateToAdmin("phone?tab=campaigns");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/Aucune demande appelable/i.test(msg)) {
        toast.error("Aucune demande appelable : il faut le consentement RGPD aux appels IA et un numéro valide.");
      } else {
        toast.error(`Échec du lancement : ${msg}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-600" />
            Campagne d'appels — relance documents
          </DialogTitle>
          <DialogDescription>
            Alex (agent IA) rappellera les clients des {offers.length} demande(s) sélectionnée(s) <strong>une par une</strong> pour
            redemander leurs documents manquants (calculés automatiquement par demande). Chaque appel est transcrit ;
            un rapport vous sera envoyé par email à la fin. Seuls les clients ayant donné leur consentement RGPD aux appels IA
            et disposant d'un numéro valide seront appelés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="vc-name">Nom de la campagne</Label>
            <Input id="vc-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Relance documents — juin" maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <Label>Langue</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as "fr" | "nl" | "en")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="nl">Néerlandais</SelectItem>
                <SelectItem value="en">Anglais</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md bg-slate-50 border px-3 py-2 max-h-32 overflow-auto text-xs text-slate-600">
            {offers.map((o) => <div key={o.offer_id} className="flex items-center gap-1.5 py-0.5"><FileText className="w-3 h-3 text-slate-400" />{o.label}</div>)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={launch} disabled={submitting} className="bg-violet-600 hover:bg-violet-700 text-white">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
            Lancer la campagne
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCampaignModal;
