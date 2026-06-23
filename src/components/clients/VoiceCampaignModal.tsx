import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";

interface SelectedClient {
  id: string;
  name: string;
}

interface VoiceCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: SelectedClient[];
  /** Appelé après un lancement réussi (pour vider la sélection). */
  onLaunched?: () => void;
}

interface Skipped { id: string; name: string; reason: string }

const VoiceCampaignModal: React.FC<VoiceCampaignModalProps> = ({ open, onOpenChange, clients, onLaunched }) => {
  const { navigateToAdmin } = useRoleNavigation();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [language, setLanguage] = useState<"fr" | "nl" | "en">("fr");
  const [submitting, setSubmitting] = useState(false);

  const launch = async () => {
    if (!name.trim()) { toast.error("Donnez un nom à la campagne"); return; }
    if (clients.length === 0) { toast.error("Aucun client sélectionné"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-campaign-start", {
        body: {
          client_ids: clients.map((c) => c.id),
          name: name.trim(),
          objective: objective.trim() || undefined,
          language,
        },
      });
      if (error) {
        // Corps serveur (consentement/numéro -> détails skipped).
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
      toast.success(`Campagne lancée : Alex va appeler ${queued} client(s), un par un.`);
      if (skipped.length > 0) {
        toast.warning(
          `${skipped.length} client(s) ignoré(s) : ${skipped.slice(0, 3).map((s) => `${s.name} (${s.reason})`).join(", ")}${skipped.length > 3 ? "…" : ""}`,
          { duration: 8000 },
        );
      }
      onOpenChange(false);
      setName(""); setObjective("");
      onLaunched?.();
      navigateToAdmin("voice-campaigns");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/Aucun client appelable/i.test(msg)) {
        toast.error("Aucun client appelable : il faut le consentement RGPD aux appels IA et un numéro valide.");
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
            Campagne d'appels avec Alex
          </DialogTitle>
          <DialogDescription>
            Alex (agent IA) appellera les {clients.length} client(s) sélectionné(s) <strong>un par un</strong>.
            Un rapport vous sera envoyé par email à la fin. Seuls les clients ayant donné leur consentement
            RGPD aux appels IA et disposant d'un numéro valide seront appelés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="vc-name">Nom de la campagne</Label>
            <Input id="vc-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Relance documents KYC — juin" maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vc-obj">Objet de l'appel (contexte donné à Alex)</Label>
            <Textarea id="vc-obj" value={objective} onChange={(e) => setObjective(e.target.value)}
              placeholder="Ex. récupérer la carte d'identité et le dernier bilan comptable"
              rows={3} maxLength={500} />
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
            {clients.map((c) => <div key={c.id} className="flex items-center gap-1.5 py-0.5"><Phone className="w-3 h-3 text-slate-400" />{c.name}</div>)}
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
